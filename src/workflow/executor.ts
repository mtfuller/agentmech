import * as readline from 'readline';
import * as path from 'path';
import OllamaClient = require('../ollama/ollama-client');
import McpClient = require('../mcp/mcp-client');
import { RAGConfig, RAGService } from '../rag/rag-service';
import { Workflow, State, NextOption } from './workflow';
import Tracer = require('../utils/tracer');
import FileHandler = require('../utils/file-handler');
import CliFormatter from '../utils/cli-formatter';

// Constants for state types and special state names
const END_STATE = 'end';
const STATE_TYPE = {
  PROMPT: 'prompt',
  INPUT: 'input',
  TRANSITION: 'transition',
  END: 'end'
} as const;

class WorkflowExecutor {
  private workflow: Workflow;
  private ollamaClient: OllamaClient;
  private mcpClient: McpClient;
  private ragService?: RAGService;
  private namedRagServices: Map<string, RAGService>;
  private context: Record<string, any>;
  private history: string[];
  private rl?: readline.Interface;
  private tracer: Tracer;
  private stopRequested: boolean;
  private runDirectory?: string;

  constructor(workflow: Workflow, ollamaUrl: string = 'http://localhost:11434', tracer?: Tracer, runDirectory?: string) {
    this.workflow = workflow;
    this.ollamaClient = new OllamaClient(ollamaUrl, tracer);
    this.mcpClient = new McpClient(tracer);
    this.context = {};
    this.history = [];
    this.namedRagServices = new Map();
    this.stopRequested = false;
    this.runDirectory = runDirectory;
    
    // Add run directory to context if provided
    if (runDirectory) {
      this.context['run_directory'] = runDirectory;
    }
    
    this.tracer = tracer || new Tracer(false);
  }

  /**
   * Get or create the readline interface
   */
  private getReadlineInterface(): readline.Interface {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }

  /**
   * Process multimodal files (images, text files, etc.) for a state
   * @param filePaths - Array of file paths to process
   * @returns Object containing processed images and text contents
   */
  private async processMultimodalFiles(filePaths: string[]): Promise<{ images: string[], textContents: string[] }> {
    const images: string[] = [];
    const textContents: string[] = [];

    if (!filePaths || filePaths.length === 0) {
      return { images, textContents };
    }

    console.log('\n' + CliFormatter.loading(`Processing ${filePaths.length} file(s) for multimodal input...`));

    for (const filePath of filePaths) {
      try {
        const resolvedPath = this.interpolateVariables(filePath);
        const processedFile = await FileHandler.processFile(resolvedPath);

        console.log(CliFormatter.success(`Processed ${processedFile.filename} (${processedFile.type})`));

        if (processedFile.type === 'image') {
          images.push(processedFile.content);
        } else if (processedFile.type === 'text') {
          textContents.push(`\n--- Content from ${processedFile.filename} ---\n${processedFile.content}\n--- End of ${processedFile.filename} ---\n`);
        }
      } catch (error: any) {
        console.warn(CliFormatter.warning(error.message));
        // Continue processing other files
      }
    }

    if (images.length > 0) {
      console.log(CliFormatter.image(`Attached ${images.length} image(s) to the prompt`));
    }

    return { images, textContents };
  }

  /**
   * Prepare prompt with RAG context if configured
   * @param prompt - Original prompt text
   * @param state - State configuration
   * @returns Promise resolving to prompt with RAG context added
   */
  private async preparePromptWithRAG(prompt: string, state: State): Promise<string> {
    let ragServiceToUse: RAGService | undefined = undefined;

    // Priority: inline rag > use_rag (named/default)
    if (state.rag) {
      console.log('\n' + CliFormatter.rag('Initializing inline RAG configuration...'));
      ragServiceToUse = new RAGService(state.rag, 'http://localhost:11434');
      await ragServiceToUse.initialize();
    }

    // Add RAG context if a service is available
    if (ragServiceToUse) {
      console.log(CliFormatter.rag('Retrieving relevant context from RAG...'));
      const relevantChunks = await ragServiceToUse.search(prompt);
      const ragContext = ragServiceToUse.formatContext(relevantChunks);

      if (ragContext) {
        console.log(CliFormatter.success('RAG context added to prompt'));
        return prompt + ragContext;
      }
    }

    return prompt;
  }

  /**
   * Connect to MCP servers configured for a state
   * @param state - State configuration
   */
  private async connectMCPServers(state: State): Promise<void> {
    if (!state.mcpServers || state.mcpServers.length === 0) {
      return;
    }

    console.log('\n' + CliFormatter.tool(`Connecting to MCP servers: ${state.mcpServers.join(', ')}`));
    for (const serverName of state.mcpServers) {
      try {
        await this.mcpClient.connectServer(serverName);
        console.log(CliFormatter.success(`Connected to MCP server: ${serverName}`));
      } catch (error: any) {
        console.warn(CliFormatter.warning(`Failed to connect to MCP server "${serverName}": ${error.message}`));
      }
    }
  }

  /**
   * Request graceful stop of workflow execution and clean up resources
   */
  stop(): void {
    if (!this.stopRequested) {
      this.stopRequested = true;
      console.log('\n\n' + CliFormatter.stop('Stop requested. Workflow will stop after the current state completes...'));
      this.tracer.traceContextUpdate('stop_requested', 'true');
    }
    
    // Clean up readline interface to prevent hanging (can be called multiple times safely)
    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<void> {
    console.log('\n' + CliFormatter.divider('='));
    console.log(CliFormatter.workflowStart(`Starting Workflow: ${this.workflow.name}`));
    console.log(CliFormatter.divider('=') + '\n');
    
    if (this.workflow.description) {
      console.log(CliFormatter.info(this.workflow.description) + '\n');
    }

    this.tracer.traceWorkflowStart(this.workflow.name, this.workflow.startState);

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
        console.log(CliFormatter.tool(`Auto-configuring filesystem MCP server with run directory: ${CliFormatter.path(this.runDirectory)}`));
        this.workflow.mcpServers['filesystem'] = {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', this.runDirectory],
          env: {}
        };
      }
    }

    // Initialize MCP servers if configured
    if (this.workflow.mcpServers) {
      console.log(CliFormatter.loading('Initializing MCP servers...'));
      for (const [serverName, config] of Object.entries(this.workflow.mcpServers)) {
        this.mcpClient.registerServer(serverName, config);
      }
      console.log(CliFormatter.success(`Registered ${Object.keys(this.workflow.mcpServers).length} MCP server(s)`) + '\n');
    }

    // Initialize default RAG if configured
    if (this.ragService) {
      console.log(CliFormatter.loading('Initializing default RAG system...'));
      await this.ragService.initialize();
      console.log('');
    }

    // Initialize named RAG services if configured
    if (this.workflow.rag) {
      console.log(CliFormatter.loading('Initializing named RAG systems...'));
      for (const [ragName, ragConfig] of Object.entries(this.workflow.rag)) {
        const ragService = new RAGService(ragConfig, 'http://localhost:11434');
        await ragService.initialize();
        this.namedRagServices.set(ragName, ragService);
        console.log(CliFormatter.success(`Initialized RAG: ${ragName}`));
      }
      console.log('');
    }

    try {
      let currentState: string | null = this.workflow.startState;
      
      while (currentState && currentState !== END_STATE && !this.stopRequested) {
        const state: State = this.workflow.states[currentState];
        console.log('\n' + CliFormatter.step(`State: ${CliFormatter.highlight(currentState)}`));
        
        try {
          this.history.push(currentState);
          this.tracer.traceStateExecutionStart(currentState, state.type);
          const nextState = await this.executeState(currentState, state);
          this.tracer.traceStateExecutionComplete(currentState, state.type);
          this.tracer.traceStateTransition(currentState, nextState || END_STATE, state.type);
          currentState = nextState;
        } catch (error: any) {
          console.error('\n' + CliFormatter.error(`Error in state "${currentState}": ${error.message}`));
          this.tracer.traceError('state_execution_error', error.message, { state: currentState });
          
          // Check for state-level fallback first
          if (state.onError) {
            console.log('\n' + CliFormatter.warning(`Transitioning to fallback state (state-level): ${state.onError}`));
            this.tracer.traceStateTransition(currentState, state.onError, 'error_fallback');
            currentState = state.onError;
            continue; // Continue the workflow with the fallback state
          }
          
          // Check for workflow-level fallback
          if (this.workflow.onError) {
            console.log('\n' + CliFormatter.warning(`Transitioning to fallback state (workflow-level): ${this.workflow.onError}`));
            this.tracer.traceStateTransition(currentState, this.workflow.onError, 'error_fallback');
            currentState = this.workflow.onError;
            continue; // Continue the workflow with the fallback state
          }
          
          // No fallback configured, re-throw the error
          throw error;
        }
      }
      
      if (this.stopRequested) {
        console.log('\n' + CliFormatter.divider('='));
        console.log(CliFormatter.stop('Workflow Stopped by User'));
        console.log(CliFormatter.divider('=') + '\n');
        this.tracer.traceContextUpdate('workflow_stopped', 'true');
      } else {
        console.log('\n' + CliFormatter.divider('='));
        console.log(CliFormatter.complete('Workflow Completed'));
        console.log(CliFormatter.divider('=') + '\n');
        this.tracer.traceWorkflowComplete();
      }
    } finally {
      // Clean up MCP connections and readline interface
      await this.mcpClient.disconnectAll();
      
      // Clean up readline interface if it was created
      if (this.rl) {
        this.rl.close();
        this.rl = undefined;
      }
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
      case STATE_TYPE.PROMPT:
        return await this.executePromptState(stateName, state);
      case STATE_TYPE.INPUT:
        return await this.executeInputState(stateName, state);
      case STATE_TYPE.TRANSITION:
        return await this.executeTransitionState(stateName, state);
      case STATE_TYPE.END:
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
    
    // Process multimodal files if provided
    const { images, textContents } = await this.processMultimodalFiles(state.files);
    
    // Append text file contents to the prompt
    if (textContents.length > 0) {
      prompt = prompt + '\n\n' + textContents.join('\n');
    }
    
    // Add RAG context if configured
    prompt = await this.preparePromptWithRAG(prompt, state);
    
    // Connect to MCP servers if specified for this state
    await this.connectMCPServers(state);
    
    const model = state.model || this.workflow.defaultModel || 'gemma3:4b';
    console.log('\n' + CliFormatter.model(`Using model: ${model}`));
    console.log(CliFormatter.loading('Generating response...') + '\n');
    
    try {
      // Create streaming callback to display tokens as they arrive
      process.stdout.write(CliFormatter.ai('Response: '));
      
      const response = await this.ollamaClient.generate(
        model, 
        prompt, 
        state.options || {}, 
        images.length > 0 ? images : undefined,
        (token: string) => {
          // Stream tokens to stdout
          process.stdout.write(token);
        }
      );
      
      process.stdout.write('\n\n');
      
      // Store response in context if variable is specified
      if (state.saveAs) {
        this.context[state.saveAs] = response;
        this.tracer.traceContextUpdate(state.saveAs, response);
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
   * @param stateName - Name of the state
   * @param state - State configuration
   * @returns Next state name
   */
  async executeInputState(stateName: string, state: State): Promise<string> {
    if (state.prompt) {
      console.log('\n' + CliFormatter.info(this.interpolateVariables(state.prompt)));
    }
    
    let defaultHint = '';
    if (state.defaultValue) {
      const interpolatedDefault = this.interpolateVariables(state.defaultValue);
      defaultHint = ` (default: ${interpolatedDefault})`;
    }
    
    const answer = await this.askQuestion(`\nEnter your response${defaultHint}: `);
    
    // Use default value if no input provided
    let userInput = answer.trim();
    if (!userInput && state.defaultValue) {
      userInput = this.interpolateVariables(state.defaultValue);
      console.log(CliFormatter.info(`Using default value: ${userInput}`));
    }
    
    // Store input in context if variable is specified
    if (state.saveAs) {
      this.context[state.saveAs] = userInput;
      this.tracer.traceContextUpdate(state.saveAs, userInput);
    }
    
    this.tracer.traceUserChoice(stateName, userInput);
    
    return state.next || END_STATE;
  }
  
  /**
   * Let the LLM select the next state from available options
   * @param nextOptions - Array of possible next states with descriptions
   * @param previousResponse - The response from the previous prompt (for context)
   * @param model - Model to use for selection
   * @returns Next state name
   */
  async selectNextState(nextOptions: NextOption[], previousResponse: string, model: string): Promise<string> {
    console.log('\n' + CliFormatter.step('LLM selecting next state'));
    
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
    
    console.log(CliFormatter.loading('Asking LLM to select next state...'));
    this.tracer.traceContextUpdate('llm_selection_prompt', selectionPrompt);
    
    try {
      const selectionResponse = await this.ollamaClient.generate(model, selectionPrompt, {});
      
      // Extract the first number found in the response (more robust parsing)
      const numberMatch = selectionResponse.match(/\d+/);
      if (!numberMatch) {
        console.warn(CliFormatter.warning(`LLM returned no number in response: "${selectionResponse}". Defaulting to first option.`));
        this.tracer.traceError('invalid_llm_selection', `No number found: ${selectionResponse}`, { defaulting: nextOptions[0].state });
        return nextOptions[0].state;
      }
      
      const selectedIndex = parseInt(numberMatch[0]) - 1;
      
      if (selectedIndex < 0 || selectedIndex >= nextOptions.length) {
        console.warn(CliFormatter.warning(`LLM returned out-of-range selection: "${selectionResponse}". Defaulting to first option.`));
        this.tracer.traceError('invalid_llm_selection', `Out of range: ${selectionResponse}`, { defaulting: nextOptions[0].state });
        return nextOptions[0].state;
      }
      
      const selectedOption = nextOptions[selectedIndex];
      console.log(CliFormatter.success(`LLM selected: ${selectedOption.state} - ${selectedOption.description}`) + '\n');
      this.tracer.traceContextUpdate('llm_selected_state', selectedOption.state);
      
      return selectedOption.state;
    } catch (error: any) {
      console.error(CliFormatter.error(`Error during LLM state selection: ${error.message}. Defaulting to first option.`));
      this.tracer.traceError('llm_selection_error', error.message, { defaulting: nextOptions[0].state });
      return nextOptions[0].state;
    }
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
      const rl = this.getReadlineInterface();
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

export = WorkflowExecutor;
