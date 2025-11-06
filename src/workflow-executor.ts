import * as readline from 'readline';
import OllamaClient = require('./ollama-client');
import McpClient = require('./mcp-client');
import RagService = require('./rag-service');
import Tracer = require('./tracer');

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

interface RagConfig {
  directory: string;
  model?: string;
  embeddingsFile?: string;
  chunkSize?: number;
  topK?: number;
}

interface State {
  type: string;
  prompt?: string;
  prompt_file?: string;
  workflow_ref?: string;
  choices?: Choice[];
  next?: string;
  model?: string;
  save_as?: string;
  options?: Record<string, any>;
  mcp_servers?: string[];
  use_rag?: boolean | string;  // true for default, or name of rag config
  rag?: RagConfig;  // inline RAG configuration
}

interface Workflow {
  name: string;
  description?: string;
  start_state: string;
  default_model?: string;
  mcp_servers?: Record<string, McpServerConfig>;
  rag?: RagConfig;  // Backward compatibility: default RAG config
  rags?: Record<string, RagConfig>;  // Named RAG configurations
  states: Record<string, State>;
}

class WorkflowExecutor {
  private workflow: Workflow;
  private ollamaClient: OllamaClient;
  private mcpClient: McpClient;
  private ragService?: RagService;
  private namedRagServices: Map<string, RagService>;
  private context: Record<string, any>;
  private history: string[];
  private rl: readline.Interface;
  private tracer: Tracer;

  constructor(workflow: Workflow, ollamaUrl: string = 'http://localhost:11434', tracer?: Tracer) {
    this.workflow = workflow;
    this.ollamaClient = new OllamaClient(ollamaUrl, tracer);
    this.mcpClient = new McpClient(tracer);
    this.context = {};
    this.history = [];
    this.namedRagServices = new Map();
    
    // Initialize default RAG service if configured
    if (workflow.rag) {
      this.ragService = new RagService(workflow.rag, ollamaUrl);
    }
    this.tracer = tracer || new Tracer(false);
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<void> {
    console.log(`\n=== Starting Workflow: ${this.workflow.name} ===\n`);
    
    if (this.workflow.description) {
      console.log(`${this.workflow.description}\n`);
    }

    this.tracer.traceWorkflowStart(this.workflow.name, this.workflow.start_state);

    // Initialize MCP servers if configured
    if (this.workflow.mcp_servers) {
      console.log('Initializing MCP servers...');
      for (const [serverName, config] of Object.entries(this.workflow.mcp_servers)) {
        this.mcpClient.registerServer(serverName, config);
      }
      console.log(`Registered ${Object.keys(this.workflow.mcp_servers).length} MCP server(s)\n`);
    }

    // Initialize default RAG if configured
    if (this.ragService) {
      console.log('Initializing default RAG system...');
      await this.ragService.initialize();
      console.log('');
    }

    // Initialize named RAG services if configured
    if (this.workflow.rags) {
      console.log('Initializing named RAG systems...');
      for (const [ragName, ragConfig] of Object.entries(this.workflow.rags)) {
        const ragService = new RagService(ragConfig, 'http://localhost:11434');
        await ragService.initialize();
        this.namedRagServices.set(ragName, ragService);
        console.log(`  ✓ Initialized RAG: ${ragName}`);
      }
      console.log('');
    }

    try {
      let currentState: string | null = this.workflow.start_state;
      
      while (currentState && currentState !== END_STATE) {
        const state = this.workflow.states[currentState];
        console.log(`\n--- State: ${currentState} ---`);
        
        try {
          this.history.push(currentState);
          this.tracer.traceStateExecutionStart(currentState, state.type);
          const nextState = await this.executeState(currentState, state);
          this.tracer.traceStateExecutionComplete(currentState, state.type);
          this.tracer.traceStateTransition(currentState, nextState || END_STATE, state.type);
          currentState = nextState;
        } catch (error: any) {
          console.error(`\nError in state "${currentState}": ${error.message}`);
          this.tracer.traceError('state_execution_error', error.message, { state: currentState });
          throw error;
        }
      }
      
      console.log('\n=== Workflow Completed ===\n');
      this.tracer.traceWorkflowComplete();
    } finally {
      // Clean up MCP connections
      await this.mcpClient.disconnectAll();
      this.rl.close();
    }
  }

  /**
   * Execute a single state
   * @param stateName - Name of the state
   * @param state - State configuration
   * @returns Next state name
   */
  async executeState(stateName: string, state: State): Promise<string> {
    switch (state.type) {
      case 'prompt':
        return await this.executePromptState(stateName, state);
      case 'choice':
        return await this.executeChoiceState(stateName, state);
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
   * @param stateName - Name of the state
   * @param state - State configuration
   * @returns Next state name
   */
  async executeTransitionState(stateName: string, state: State): Promise<string> {
    // Transition states are used internally for workflow references
    // They don't display anything, just move to the next state
    return state.next || END_STATE;
  }

  /**
   * Execute a prompt state (sends prompt to Ollama)
   * @param stateName - Name of the state
   * @param state - State configuration
   * @returns Next state name
   */
  async executePromptState(stateName: string, state: State): Promise<string> {
    let prompt = this.interpolateVariables(state.prompt || '');
    console.log(`\nPrompt: ${prompt}`);
    
    // Determine which RAG service to use
    let ragServiceToUse: RagService | undefined = undefined;
    
    // Priority: inline rag > use_rag (named/default) 
    if (state.rag) {
      // Inline RAG configuration
      console.log('\nInitializing inline RAG configuration...');
      ragServiceToUse = new RagService(state.rag, 'http://localhost:11434');
      await ragServiceToUse.initialize();
    } else if (state.use_rag) {
      if (typeof state.use_rag === 'string') {
        // Named RAG reference
        ragServiceToUse = this.namedRagServices.get(state.use_rag);
        if (ragServiceToUse) {
          console.log(`\nUsing RAG configuration: ${state.use_rag}`);
        }
      } else if (state.use_rag === true) {
        // Default RAG
        ragServiceToUse = this.ragService;
        if (ragServiceToUse) {
          console.log('\nUsing default RAG configuration');
        }
      }
    }
    
    // Add RAG context if a service is available
    if (ragServiceToUse) {
      console.log('Retrieving relevant context from RAG...');
      const relevantChunks = await ragServiceToUse.search(prompt);
      const ragContext = ragServiceToUse.formatContext(relevantChunks);
      
      if (ragContext) {
        prompt = prompt + ragContext;
        console.log('RAG context added to prompt');
      }
    }
    
    // Connect to MCP servers if specified for this state
    if (state.mcp_servers && state.mcp_servers.length > 0) {
      console.log(`\nConnecting to MCP servers: ${state.mcp_servers.join(', ')}`);
      for (const serverName of state.mcp_servers) {
        try {
          await this.mcpClient.connectServer(serverName);
          console.log(`✓ Connected to MCP server: ${serverName}`);
        } catch (error: any) {
          console.warn(`⚠ Failed to connect to MCP server "${serverName}": ${error.message}`);
        }
      }
      
      // Note: Full MCP protocol communication for querying tools/resources is not yet implemented.
      // The infrastructure is in place for future integration with MCP servers via JSON-RPC over stdio.
    }
    
    const model = state.model || this.workflow.default_model || 'llama2';
    console.log(`\nUsing model: ${model}`);
    console.log('Generating response...\n');
    
    try {
      const response = await this.ollamaClient.generate(model, prompt, state.options || {});
      console.log(`Response: ${response}\n`);
      
      // Store response in context if variable is specified
      if (state.save_as) {
        this.context[state.save_as] = response;
        this.tracer.traceContextUpdate(state.save_as, response);
      }
      
      return state.next || END_STATE;
    } catch (error: any) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Execute a choice state (presents options to user)
   * @param stateName - Name of the state
   * @param state - State configuration
   * @returns Next state name
   */
  async executeChoiceState(stateName: string, state: State): Promise<string> {
    if (state.prompt) {
      console.log(`\n${this.interpolateVariables(state.prompt)}`);
    }
    
    console.log('\nChoices:');
    state.choices?.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice.label || choice.value}`);
    });
    
    const answer = await this.askQuestion('\nSelect an option (enter number): ');
    const choiceIndex = parseInt(answer) - 1;
    
    if (!state.choices || choiceIndex < 0 || choiceIndex >= state.choices.length) {
      console.log('Invalid choice, please try again.');
      return stateName; // Stay in current state
    }
    
    const selectedChoice = state.choices[choiceIndex];
    
    // Store choice in context if variable is specified
    if (state.save_as) {
      this.context[state.save_as] = selectedChoice.value || selectedChoice.label;
      this.tracer.traceContextUpdate(state.save_as, selectedChoice.value || selectedChoice.label);
    }
    
    this.tracer.traceUserChoice(stateName, selectedChoice.value || selectedChoice.label || '');
    
    console.log(`\nSelected: ${selectedChoice.label || selectedChoice.value}`);
    
    return selectedChoice.next || state.next || END_STATE;
  }

  /**
   * Interpolate variables in a string
   * @param text - Text with variables like {{variable}}
   * @returns Text with variables replaced
   */
  interpolateVariables(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return this.context[varName] || match;
    });
  }

  /**
   * Ask user a question via readline
   * @param question - Question to ask
   * @returns User's answer
   */
  askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

export = WorkflowExecutor;
