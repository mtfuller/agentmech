import * as readline from 'readline';
import OllamaClient = require('./ollama-client');

const END_STATE = 'end';

interface Choice {
  label?: string;
  value?: string;
  next?: string;
}

interface State {
  type: string;
  prompt?: string;
  choices?: Choice[];
  next?: string;
  model?: string;
  save_as?: string;
  options?: Record<string, any>;
}

interface Workflow {
  name: string;
  description?: string;
  start_state: string;
  default_model?: string;
  states: Record<string, State>;
}

class WorkflowExecutor {
  private workflow: Workflow;
  private ollamaClient: OllamaClient;
  private context: Record<string, any>;
  private history: string[];
  private rl: readline.Interface;

  constructor(workflow: Workflow, ollamaUrl: string = 'http://localhost:11434') {
    this.workflow = workflow;
    this.ollamaClient = new OllamaClient(ollamaUrl);
    this.context = {};
    this.history = [];
    
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

    let currentState: string | null = this.workflow.start_state;
    
    while (currentState && currentState !== END_STATE) {
      const state = this.workflow.states[currentState];
      console.log(`\n--- State: ${currentState} ---`);
      
      try {
        this.history.push(currentState);
        currentState = await this.executeState(currentState, state);
      } catch (error: any) {
        console.error(`\nError in state "${currentState}": ${error.message}`);
        this.rl.close();
        throw error;
      }
    }
    
    console.log('\n=== Workflow Completed ===\n');
    this.rl.close();
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
      case END_STATE:
        return END_STATE;
      default:
        throw new Error(`Unknown state type: ${state.type}`);
    }
  }

  /**
   * Execute a prompt state (sends prompt to Ollama)
   * @param stateName - Name of the state
   * @param state - State configuration
   * @returns Next state name
   */
  async executePromptState(stateName: string, state: State): Promise<string> {
    const prompt = this.interpolateVariables(state.prompt || '');
    console.log(`\nPrompt: ${prompt}`);
    
    const model = state.model || this.workflow.default_model || 'llama2';
    console.log(`Using model: ${model}`);
    console.log('\nGenerating response...\n');
    
    try {
      const response = await this.ollamaClient.generate(model, prompt, state.options || {});
      console.log(`Response: ${response}\n`);
      
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
    }
    
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
