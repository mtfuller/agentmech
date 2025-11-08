import OllamaClient = require('../ollama/ollama-client');
import McpClient = require('../mcp/mcp-client');
import { RAGService } from '../rag/rag-service';
import { Response } from 'express';
import { Workflow, State, NextOption, McpServerConfig } from '../workflow/workflow';

const END_STATE = 'end';
const INPUT_TIMEOUT_MS = 300000; // 5 minutes

// interface NextOption {
//   state: string;
//   description: string;
// }

// interface McpServerConfig {
//   command?: string;  // Optional for type-based configs, but always set after normalization
//   args?: string[];
//   env?: Record<string, string>;
// }

// interface RagConfig {
//   directory: string;
//   model?: string;
//   embeddingsFile?: string;
//   chunkSize?: number;
//   topK?: number;
// }

// interface State {
//   type: string;
//   prompt?: string;
//   prompt_file?: string;
//   workflow_ref?: string;
//   next?: string;
//   next_options?: NextOption[];  // LLM-driven state selection
//   model?: string;
//   save_as?: string;
//   options?: Record<string, any>;
//   mcp_servers?: string[];
//   use_rag?: boolean | string;  // true for default, or name of rag config
//   rag?: RagConfig;  // inline RAG configuration
//   default_value?: string;  // default value for input state
//   on_error?: string;  // Fallback state to transition to on error (state-level)
// }

// interface Workflow {
//   name: string;
//   description?: string;
//   start_state: string;
//   default_model?: string;
//   mcp_servers?: Record<string, McpServerConfig>;
//   rag?: RagConfig;  // Backward compatibility: default RAG config
//   rags?: Record<string, RagConfig>;  // Named RAG configurations
//   on_error?: string;  // Fallback state to transition to on error (workflow-level)
//   states: Record<string, State>;
// }

interface ExecutionEvent {
  type: 'log' | 'prompt' | 'input' | 'response' | 'error' | 'complete' | 'state_change' | 'stopped' | 'prompt_sent';
  message?: string;
  data?: any;
}

class WebWorkflowExecutor {
  private workflow: Workflow;
  private ollamaClient: OllamaClient;
  private mcpClient: McpClient;
  private ragService?: RAGService;
  private namedRagServices: Map<string, RAGService>;
  private context: Record<string, any>;
  private history: string[];
  private sseResponse?: Response;
  private sessionId?: string;
  private pendingInput?: { resolve: (value: string) => void; reject: (error: any) => void };
  private stopRequested: boolean;
  private runDirectory?: string;

  constructor(workflow: Workflow, ollamaUrl: string = 'http://localhost:11434', runDirectory?: string) {
    this.workflow = workflow;
    this.ollamaClient = new OllamaClient(ollamaUrl);
    this.mcpClient = new McpClient();
    this.context = {};
    this.history = [];
    this.namedRagServices = new Map();
    this.stopRequested = false;
    this.runDirectory = runDirectory;
    
    // Add run directory to context if provided
    if (runDirectory) {
      this.context['run_directory'] = runDirectory;
    }
  }

  /**
   * Request graceful stop of workflow execution
   */
  stop(): void {
    if (!this.stopRequested) {
      this.stopRequested = true;
      this.sendEvent({
        type: 'log',
        message: '🛑 Stop requested. Workflow will stop after the current state completes...'
      });
      
      // Cancel any pending input
      if (this.pendingInput) {
        this.pendingInput.reject(new Error('Workflow stopped by user'));
        this.pendingInput = undefined;
      }
    }
  }

  /**
   * Set SSE response for streaming events
   */
  setSseResponse(res: Response, sessionId: string): void {
    this.sseResponse = res;
    this.sessionId = sessionId;
    this.sseResponse.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send session ID as the first event
    this.sendEvent({
      type: 'log',
      message: 'Connected',
      data: { sessionId }
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
      }, INPUT_TIMEOUT_MS);
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

      // Auto-inject filesystem MCP server if run directory is provided and not already configured
      if (this.runDirectory) {
        // Initialize mcpServers if not present
        if (!this.workflow.mcpServers) {
          this.workflow.mcpServers = {};
        }
        
        // Check if filesystem server is already configured
        const hasFilesystemServer = Object.entries(this.workflow.mcpServers).some(
          ([name, config]) => {
            // Check if it's explicitly named 'filesystem' or uses the filesystem package
            return name === 'filesystem' || 
                   (config.args && config.args.some(arg => arg.includes('@modelcontextprotocol/server-filesystem')));
          }
        );
        
        // If no filesystem server configured, auto-inject one
        if (!hasFilesystemServer) {
          this.sendEvent({
            type: 'log',
            message: `Auto-configuring filesystem MCP server with run directory: ${this.runDirectory}`
          });
          this.workflow.mcpServers['filesystem'] = {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', this.runDirectory],
            env: {}
          };
        }
      }

      // Initialize MCP servers if configured
      if (this.workflow.mcpServers) {
        this.sendEvent({
          type: 'log',
          message: 'Initializing MCP servers...'
        });
        for (const [serverName, config] of Object.entries(this.workflow.mcpServers)) {
          this.mcpClient.registerServer(serverName, config);
        }
        this.sendEvent({
          type: 'log',
          message: `Registered ${Object.keys(this.workflow.mcpServers).length} MCP server(s)`
        });
      }

      // Initialize default RAG if configured
      if (this.ragService) {
        this.sendEvent({
          type: 'log',
          message: 'Initializing default RAG system...'
        });
        await this.ragService.initialize();
        this.sendEvent({
          type: 'log',
          message: 'Default RAG system initialized'
        });
      }

      // Initialize named RAG services if configured
      if (this.workflow.rag) {
        this.sendEvent({
          type: 'log',
          message: 'Initializing named RAG systems...'
        });
        for (const [ragName, ragConfig] of Object.entries(this.workflow.rag)) {
          const ragService = new RAGService(ragConfig, 'http://localhost:11434');
          await ragService.initialize();
          this.namedRagServices.set(ragName, ragService);
          this.sendEvent({
            type: 'log',
            message: `  ✓ Initialized RAG: ${ragName}`
          });
        }
      }

      let currentState: string | null = this.workflow.startState;

      while (currentState && currentState !== END_STATE && !this.stopRequested) {
        const state: State = this.workflow.states[currentState];
        
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
          
          // Check for state-level fallback first
          if (state.onError) {
            this.sendEvent({
              type: 'log',
              message: `Transitioning to fallback state (state-level): ${state.onError}`
            });
            currentState = state.onError;
            continue; // Continue the workflow with the fallback state
          }
          
          // Check for workflow-level fallback
          if (this.workflow.onError) {
            this.sendEvent({
              type: 'log',
              message: `Transitioning to fallback state (workflow-level): ${this.workflow.onError}`
            });
            currentState = this.workflow.onError;
            continue; // Continue the workflow with the fallback state
          }
          
          // No fallback configured, re-throw the error
          throw error;
        }
      }

      if (this.stopRequested) {
        this.sendEvent({
          type: 'stopped',
          message: 'Workflow Stopped by User'
        });
      } else {
        this.sendEvent({
          type: 'complete',
          message: 'Workflow Completed'
        });
      }
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
      case 'input':
        return await this.executeInputState(stateName, state);
      case 'transition':
        return await this.executeTransitionState(stateName, state);
      case END_STATE:
        return END_STATE;
      default:
        throw new Error(`Unknown state type: ${state.type}`);
    }
  }

  /**
   * Execute a transition state (simply transitions to the next state)
   */
  private async executeTransitionState(stateName: string, state: State): Promise<string> {
    // Transition states are used internally for workflow references
    // They don't display anything, just move to the next state
    return state.next || END_STATE;
  }

  /**
   * Execute a prompt state (sends prompt to Ollama)
   */
  private async executePromptState(stateName: string, state: State): Promise<string> {
    let prompt = this.interpolateVariables(state.prompt || '');
    
    this.sendEvent({
      type: 'log',
      message: `Prompt: ${prompt}`
    });

    // Determine which RAG service to use
    let ragServiceToUse: RAGService | undefined = undefined;
    
    // Priority: inline rag > use_rag (named/default) 
    if (state.rag) {
      // Inline RAG configuration
      this.sendEvent({
        type: 'log',
        message: 'Initializing inline RAG configuration...'
      });
      ragServiceToUse = new RAGService(state.rag, 'http://localhost:11434');
      await ragServiceToUse.initialize();
    } else if (state.useRag) {
      if (typeof state.useRag === 'string') {
        // Named RAG reference
        ragServiceToUse = this.namedRagServices.get(state.useRag);
        if (ragServiceToUse) {
          this.sendEvent({
            type: 'log',
            message: `Using RAG configuration: ${state.useRag}`
          });
        }
      } else if (state.useRag === true) {
        // Default RAG
        ragServiceToUse = this.ragService;
        if (ragServiceToUse) {
          this.sendEvent({
            type: 'log',
            message: 'Using default RAG configuration'
          });
        }
      }
    }
    
    // Add RAG context if a service is available
    if (ragServiceToUse) {
      this.sendEvent({
        type: 'log',
        message: 'Retrieving relevant context from RAG...'
      });
      
      const relevantChunks = await ragServiceToUse.search(prompt);
      const ragContext = ragServiceToUse.formatContext(relevantChunks);
      
      if (ragContext) {
        prompt = prompt + ragContext;
        this.sendEvent({
          type: 'log',
          message: 'RAG context added to prompt'
        });
      }
    }

    // Connect to MCP servers if specified for this state
    if (state.mcpServers && state.mcpServers.length > 0) {
      this.sendEvent({
        type: 'log',
        message: `Connecting to MCP servers: ${state.mcpServers.join(', ')}`
      });
      
      for (const serverName of state.mcpServers) {
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

    const model = state.model || this.workflow.defaultModel || 'gemma3:4b';
    this.sendEvent({
      type: 'log',
      message: `Using model: ${model}`
    });
    
    // Send the full prompt that will be sent to the model
    this.sendEvent({
      type: 'prompt_sent',
      message: 'Full prompt sent to model',
      data: { fullPrompt: prompt, model }
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
      if (state.saveAs) {
        this.context[state.saveAs] = response;
      }

      // Handle LLM-driven state selection if nextOptions is defined
      if (state.nextOptions && state.nextOptions.length > 0) {
        return await this.selectNextState(state.nextOptions, response, model);
      }

      return state.next || END_STATE;
    } catch (error: any) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }



  /**
   * Execute an input state (asks user for freeform text input)
   */
  private async executeInputState(stateName: string, state: State): Promise<string> {
    if (state.prompt) {
      this.sendEvent({
        type: 'log',
        message: this.interpolateVariables(state.prompt)
      });
    }

    // Send input request event with optional default value
    const defaultValue = state.defaultValue ? this.interpolateVariables(state.defaultValue) : undefined;
    
    // Request input from user
    const userInput = await new Promise<string>((resolve, reject) => {
      this.sendEvent({
        type: 'input',
        data: { defaultValue }
      });
      
      this.pendingInput = { 
        resolve: (value: string) => resolve(value),
        reject 
      };
      
      // Set timeout to prevent hanging forever
      setTimeout(() => {
        if (this.pendingInput) {
          this.pendingInput.reject(new Error('Input timeout'));
          this.pendingInput = undefined;
        }
      }, INPUT_TIMEOUT_MS);
    });

    // Use default value if no input provided (matching CLI behavior)
    let finalInput = userInput.trim();
    if (!finalInput && state.defaultValue) {
      finalInput = this.interpolateVariables(state.defaultValue);
    }

    // Store input in context if variable is specified
    if (state.saveAs) {
      this.context[state.saveAs] = finalInput;
    }

    this.sendEvent({
      type: 'log',
      message: `Input: ${finalInput}`
    });

    return state.next || END_STATE;
  }
  
  /**
   * Let the LLM select the next state from available options
   */
  private async selectNextState(nextOptions: NextOption[], previousResponse: string, model: string): Promise<string> {
    this.sendEvent({
      type: 'log',
      message: '--- LLM selecting next state ---'
    });
    
    // Sanitize and limit the previous response to prevent token overflow and injection
    const maxResponseLength = 500;
    const sanitizedResponse = previousResponse
      .substring(0, maxResponseLength)
      .replace(/[^\w\s\-.,!?]/g, ' ')  // Remove special characters
      .trim();
    
    const truncatedMessage = previousResponse.length > maxResponseLength ? ' [truncated]' : '';
    
    // Build a prompt for the LLM to select the next state
    let selectionPrompt = `Based on the previous response, select the most appropriate next step from the following options:\n\n`;
    selectionPrompt += `Previous response: "${sanitizedResponse}${truncatedMessage}"\n\n`;
    selectionPrompt += `Available options:\n`;
    
    nextOptions.forEach((option, index) => {
      selectionPrompt += `${index + 1}. ${option.state}: ${option.description}\n`;
    });
    
    selectionPrompt += `\nRespond with ONLY the number (1-${nextOptions.length}) of the most appropriate next step. Do not include any explanation, just the number.`;
    
    this.sendEvent({
      type: 'log',
      message: 'Asking LLM to select next state...'
    });
    
    try {
      const selectionResponse = await this.ollamaClient.generate(model, selectionPrompt, {});
      
      // Extract the first number found in the response (more robust parsing)
      const numberMatch = selectionResponse.match(/\d+/);
      if (!numberMatch) {
        this.sendEvent({
          type: 'log',
          message: `LLM returned no number in response: "${selectionResponse}". Defaulting to first option.`
        });
        return nextOptions[0].state;
      }
      
      const selectedIndex = parseInt(numberMatch[0]) - 1;
      
      if (selectedIndex < 0 || selectedIndex >= nextOptions.length) {
        this.sendEvent({
          type: 'log',
          message: `LLM returned out-of-range selection: "${selectionResponse}". Defaulting to first option.`
        });
        return nextOptions[0].state;
      }
      
      const selectedOption = nextOptions[selectedIndex];
      this.sendEvent({
        type: 'log',
        message: `✓ LLM selected: ${selectedOption.state} - ${selectedOption.description}`
      });
      
      return selectedOption.state;
    } catch (error: any) {
      this.sendEvent({
        type: 'log',
        message: `Error during LLM state selection: ${error.message}. Defaulting to first option.`
      });
      return nextOptions[0].state;
    }
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
