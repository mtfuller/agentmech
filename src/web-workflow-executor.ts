import OllamaClient = require('./ollama-client');
import McpClient = require('./mcp-client');
import { Response } from 'express';

const END_STATE = 'end';

interface Choice {
  label?: string;
  value?: string;
  next?: string;
}

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface State {
  type: string;
  prompt?: string;
  choices?: Choice[];
  next?: string;
  model?: string;
  save_as?: string;
  options?: Record<string, any>;
  mcp_servers?: string[];
}

interface Workflow {
  name: string;
  description?: string;
  start_state: string;
  default_model?: string;
  mcp_servers?: Record<string, McpServerConfig>;
  states: Record<string, State>;
}

interface ExecutionEvent {
  type: 'log' | 'prompt' | 'choice' | 'response' | 'error' | 'complete' | 'state_change';
  message?: string;
  data?: any;
}

class WebWorkflowExecutor {
  private workflow: Workflow;
  private ollamaClient: OllamaClient;
  private mcpClient: McpClient;
  private context: Record<string, any>;
  private history: string[];
  private sseResponse?: Response;
  private pendingInput?: { resolve: (value: string) => void; reject: (error: any) => void };

  constructor(workflow: Workflow, ollamaUrl: string = 'http://localhost:11434') {
    this.workflow = workflow;
    this.ollamaClient = new OllamaClient(ollamaUrl);
    this.mcpClient = new McpClient();
    this.context = {};
    this.history = [];
  }

  /**
   * Set SSE response for streaming events
   */
  setSseResponse(res: Response): void {
    this.sseResponse = res;
    this.sseResponse.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
  }

  /**
   * Send an event to the client via SSE
   */
  private sendEvent(event: ExecutionEvent): void {
    if (this.sseResponse) {
      this.sseResponse.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  }

  /**
   * Provide user input to resolve a pending input request
   */
  provideInput(input: string): void {
    if (this.pendingInput) {
      this.pendingInput.resolve(input);
      this.pendingInput = undefined;
    }
  }

  /**
   * Request input from the user
   */
  private async requestInput(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingInput = { resolve, reject };
      this.sendEvent({
        type: 'prompt',
        message: prompt
      });
      
      // Set timeout to prevent hanging forever
      setTimeout(() => {
        if (this.pendingInput) {
          this.pendingInput.reject(new Error('Input timeout'));
          this.pendingInput = undefined;
        }
      }, 300000); // 5 minute timeout
    });
  }

  /**
   * Request choice from the user
   */
  private async requestChoice(choices: Choice[]): Promise<number> {
    return new Promise((resolve, reject) => {
      this.sendEvent({
        type: 'choice',
        data: { choices }
      });
      
      this.pendingInput = {
        resolve: (value: string) => {
          const choiceIndex = parseInt(value, 10);
          if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= choices.length) {
            reject(new Error('Invalid choice'));
          } else {
            resolve(choiceIndex);
          }
        },
        reject
      };
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingInput) {
          this.pendingInput.reject(new Error('Choice timeout'));
          this.pendingInput = undefined;
        }
      }, 300000); // 5 minute timeout
    });
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<void> {
    try {
      this.sendEvent({
        type: 'log',
        message: `Starting Workflow: ${this.workflow.name}`
      });

      if (this.workflow.description) {
        this.sendEvent({
          type: 'log',
          message: this.workflow.description
        });
      }

      // Initialize MCP servers if configured
      if (this.workflow.mcp_servers) {
        this.sendEvent({
          type: 'log',
          message: 'Initializing MCP servers...'
        });
        for (const [serverName, config] of Object.entries(this.workflow.mcp_servers)) {
          this.mcpClient.registerServer(serverName, config);
        }
        this.sendEvent({
          type: 'log',
          message: `Registered ${Object.keys(this.workflow.mcp_servers).length} MCP server(s)`
        });
      }

      let currentState: string | null = this.workflow.start_state;

      while (currentState && currentState !== END_STATE) {
        const state = this.workflow.states[currentState];
        
        this.sendEvent({
          type: 'state_change',
          message: `State: ${currentState}`,
          data: { stateName: currentState }
        });

        try {
          this.history.push(currentState);
          currentState = await this.executeState(currentState, state);
        } catch (error: any) {
          this.sendEvent({
            type: 'error',
            message: `Error in state "${currentState}": ${error.message}`
          });
          throw error;
        }
      }

      this.sendEvent({
        type: 'complete',
        message: 'Workflow Completed'
      });
    } catch (error: any) {
      this.sendEvent({
        type: 'error',
        message: error.message
      });
      throw error;
    } finally {
      // Clean up MCP connections
      await this.mcpClient.disconnectAll();
      
      // Close SSE connection
      if (this.sseResponse) {
        this.sseResponse.end();
      }
    }
  }

  /**
   * Execute a single state
   */
  private async executeState(stateName: string, state: State): Promise<string> {
    switch (state.type) {
      case 'prompt':
        return await this.executePromptState(stateName, state);
      case 'choice':
        return await this.executeChoiceState(stateName, state);
      case END_STATE:
        return END_STATE;
      default:
        throw new Error(`Unknown state type: ${state.type}`);
    }
  }

  /**
   * Execute a prompt state (sends prompt to Ollama)
   */
  private async executePromptState(stateName: string, state: State): Promise<string> {
    const prompt = this.interpolateVariables(state.prompt || '');
    
    this.sendEvent({
      type: 'log',
      message: `Prompt: ${prompt}`
    });

    // Connect to MCP servers if specified for this state
    if (state.mcp_servers && state.mcp_servers.length > 0) {
      this.sendEvent({
        type: 'log',
        message: `Connecting to MCP servers: ${state.mcp_servers.join(', ')}`
      });
      
      for (const serverName of state.mcp_servers) {
        try {
          await this.mcpClient.connectServer(serverName);
          this.sendEvent({
            type: 'log',
            message: `✓ Connected to MCP server: ${serverName}`
          });
        } catch (error: any) {
          this.sendEvent({
            type: 'log',
            message: `⚠ Failed to connect to MCP server "${serverName}": ${error.message}`
          });
        }
      }
    }

    const model = state.model || this.workflow.default_model || 'llama2';
    this.sendEvent({
      type: 'log',
      message: `Using model: ${model}`
    });
    
    this.sendEvent({
      type: 'log',
      message: 'Generating response...'
    });

    try {
      const response = await this.ollamaClient.generate(model, prompt, state.options || {});
      
      this.sendEvent({
        type: 'response',
        message: response,
        data: { response }
      });

      // Store response in context if variable is specified
      if (state.save_as) {
        this.context[state.save_as] = response;
      }

      return state.next || END_STATE;
    } catch (error: any) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Execute a choice state (presents options to user)
   */
  private async executeChoiceState(stateName: string, state: State): Promise<string> {
    if (state.prompt) {
      this.sendEvent({
        type: 'log',
        message: this.interpolateVariables(state.prompt)
      });
    }

    if (!state.choices || state.choices.length === 0) {
      throw new Error('Choice state has no choices');
    }

    const choiceIndex = await this.requestChoice(state.choices);
    const selectedChoice = state.choices[choiceIndex];

    // Store choice in context if variable is specified
    if (state.save_as) {
      this.context[state.save_as] = selectedChoice.value || selectedChoice.label;
    }

    this.sendEvent({
      type: 'log',
      message: `Selected: ${selectedChoice.label || selectedChoice.value}`
    });

    return selectedChoice.next || state.next || END_STATE;
  }

  /**
   * Interpolate variables in a string
   */
  private interpolateVariables(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return this.context[varName] || match;
    });
  }
}

export = WebWorkflowExecutor;
