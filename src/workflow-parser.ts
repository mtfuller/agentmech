import * as yaml from 'js-yaml';
import * as fs from 'fs';

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

class WorkflowParser {
  /**
   * Parse a workflow YAML file
   * @param filePath - Path to the YAML file
   * @returns Parsed workflow object
   */
  static parseFile(filePath: string): Workflow {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const workflow = yaml.load(fileContent) as Workflow;
      
      this.validateWorkflow(workflow);
      
      return workflow;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Workflow file not found: ${filePath}`);
      }
      throw new Error(`Failed to parse workflow: ${error.message}`);
    }
  }

  /**
   * Validate workflow structure
   * @param workflow - The workflow object to validate
   * @throws {Error} If workflow is invalid
   */
  static validateWorkflow(workflow: Workflow): void {
    if (!workflow) {
      throw new Error('Workflow is empty');
    }

    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }

    if (!workflow.states || typeof workflow.states !== 'object') {
      throw new Error('Workflow must have a states object');
    }

    if (!workflow.start_state) {
      throw new Error('Workflow must specify a start_state');
    }

    if (!workflow.states[workflow.start_state]) {
      throw new Error(`Start state "${workflow.start_state}" not found in states`);
    }

    // Validate each state
    for (const [stateName, state] of Object.entries(workflow.states)) {
      this.validateState(stateName, state, workflow.states);
    }
  }

  /**
   * Validate a single state
   * @param name - State name
   * @param state - State configuration
   * @param allStates - All states for reference validation
   */
  static validateState(name: string, state: State, allStates: Record<string, State>): void {
    if (!state.type) {
      throw new Error(`State "${name}" must have a type`);
    }

    const validTypes = ['prompt', 'choice', END_STATE];
    if (!validTypes.includes(state.type)) {
      throw new Error(`State "${name}" has invalid type "${state.type}". Must be one of: ${validTypes.join(', ')}`);
    }

    if (state.type === 'prompt' && !state.prompt) {
      throw new Error(`Prompt state "${name}" must have a prompt field`);
    }

    if (state.type === 'choice' && !state.choices) {
      throw new Error(`Choice state "${name}" must have a choices field`);
    }

    // Validate transitions
    if (state.next && !allStates[state.next] && state.next !== END_STATE) {
      throw new Error(`State "${name}" references non-existent next state "${state.next}"`);
    }

    // Validate choice transitions
    if (state.type === 'choice' && state.choices) {
      for (const choice of state.choices) {
        if (choice.next && !allStates[choice.next] && choice.next !== END_STATE) {
          throw new Error(`Choice in state "${name}" references non-existent next state "${choice.next}"`);
        }
      }
    }
  }
}

export = WorkflowParser;
