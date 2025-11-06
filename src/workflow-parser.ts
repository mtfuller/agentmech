import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

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
  prompt_file?: string;
  workflow_ref?: string;
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

class WorkflowParser {
  /**
   * Parse a workflow YAML file
   * @param filePath - Path to the YAML file
   * @param visitedFiles - Set of already visited files to detect cycles
   * @returns Parsed workflow object
   */
  static parseFile(filePath: string, visitedFiles: Set<string> = new Set()): Workflow {
    try {
      // Resolve to absolute path for cycle detection
      const absolutePath = path.resolve(filePath);
      
      // Check for circular references
      if (visitedFiles.has(absolutePath)) {
        throw new Error(`Circular workflow reference detected: ${absolutePath}`);
      }
      
      // Add current file to visited set
      const newVisitedFiles = new Set(visitedFiles);
      newVisitedFiles.add(absolutePath);
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const workflow = yaml.load(fileContent) as Workflow;
      
      // Resolve external file references
      this.resolveExternalReferences(workflow, filePath, newVisitedFiles);
      
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
   * Resolve external file references in the workflow
   * @param workflow - The workflow object
   * @param workflowFilePath - Path to the workflow file (for resolving relative paths)
   * @param visitedFiles - Set of already visited files to detect cycles
   */
  static resolveExternalReferences(workflow: Workflow, workflowFilePath: string, visitedFiles: Set<string> = new Set()): void {
    const workflowDir = path.dirname(workflowFilePath);
    
    for (const [stateName, state] of Object.entries(workflow.states)) {
      // Resolve prompt_file reference
      if (state.prompt_file) {
        // Check for conflicting prompt definitions
        if (state.prompt) {
          throw new Error(`State "${stateName}" has both prompt and prompt_file fields. Use only one.`);
        }
        
        const promptFilePath = path.resolve(workflowDir, state.prompt_file);
        try {
          state.prompt = fs.readFileSync(promptFilePath, 'utf8');
          // Keep prompt_file for reference but prompt now contains the content
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            throw new Error(`Prompt file not found for state "${stateName}": ${promptFilePath}`);
          }
          throw new Error(`Failed to read prompt file for state "${stateName}": ${error.message}`);
        }
      }
      
      // Resolve workflow_ref reference
      if (state.workflow_ref) {
        // Validate workflow_ref state before transformation
        if (state.type !== 'workflow_ref') {
          throw new Error(`State "${stateName}" has workflow_ref field but type is "${state.type}" instead of "workflow_ref"`);
        }
        
        const referencedWorkflowPath = path.resolve(workflowDir, state.workflow_ref);
        try {
          const referencedWorkflow = this.parseFile(referencedWorkflowPath, visitedFiles);
          
          // Import all states from the referenced workflow
          const statePrefix = stateName + '_ref_';
          for (const [refStateName, refState] of Object.entries(referencedWorkflow.states)) {
            const newStateName = statePrefix + refStateName;
            workflow.states[newStateName] = { ...refState };
            
            // Update next references to point to prefixed states
            if (workflow.states[newStateName].next && workflow.states[newStateName].next !== END_STATE) {
              workflow.states[newStateName].next = statePrefix + workflow.states[newStateName].next;
            }
            
            // Update choice next references
            if (workflow.states[newStateName].choices) {
              workflow.states[newStateName].choices = workflow.states[newStateName].choices!.map(choice => ({
                ...choice,
                next: choice.next && choice.next !== END_STATE ? statePrefix + choice.next : choice.next
              }));
            }
          }
          
          // Replace the workflow_ref state with a transition to the referenced workflow's start state
          const referencedStartState = statePrefix + referencedWorkflow.start_state;
          state.type = 'transition';
          state.next = referencedStartState;
          delete state.workflow_ref;
          
          // Also copy over default_model and mcp_servers if not already present
          if (referencedWorkflow.default_model && !workflow.default_model) {
            workflow.default_model = referencedWorkflow.default_model;
          }
          if (referencedWorkflow.mcp_servers) {
            workflow.mcp_servers = workflow.mcp_servers || {};
            for (const [serverName, config] of Object.entries(referencedWorkflow.mcp_servers)) {
              if (!workflow.mcp_servers[serverName]) {
                workflow.mcp_servers[serverName] = config;
              }
            }
          }
        } catch (error: any) {
          throw new Error(`Failed to load referenced workflow for state "${stateName}": ${error.message}`);
        }
      }
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

    // Validate MCP servers configuration if present
    if (workflow.mcp_servers) {
      this.validateMcpServers(workflow.mcp_servers);
    }

    // Validate each state
    for (const [stateName, state] of Object.entries(workflow.states)) {
      this.validateState(stateName, state, workflow.states, workflow.mcp_servers);
    }
  }

  /**
   * Validate MCP servers configuration
   * @param mcpServers - MCP servers configuration
   */
  static validateMcpServers(mcpServers: Record<string, McpServerConfig>): void {
    for (const [serverName, config] of Object.entries(mcpServers)) {
      if (!config.command) {
        throw new Error(`MCP server "${serverName}" must have a command`);
      }
      if (typeof config.command !== 'string') {
        throw new Error(`MCP server "${serverName}" command must be a string`);
      }
      if (config.args && !Array.isArray(config.args)) {
        throw new Error(`MCP server "${serverName}" args must be an array`);
      }
      if (config.env && typeof config.env !== 'object') {
        throw new Error(`MCP server "${serverName}" env must be an object`);
      }
    }
  }

  /**
   * Validate a single state
   * @param name - State name
   * @param state - State configuration
   * @param allStates - All states for reference validation
   * @param mcpServers - MCP servers available in workflow
   */
  static validateState(name: string, state: State, allStates: Record<string, State>, mcpServers?: Record<string, McpServerConfig>): void {
    if (!state.type) {
      throw new Error(`State "${name}" must have a type`);
    }

    const validTypes = ['prompt', 'choice', 'workflow_ref', 'transition', END_STATE];
    if (!validTypes.includes(state.type)) {
      throw new Error(`State "${name}" has invalid type "${state.type}". Must be one of: ${validTypes.join(', ')}`);
    }

    if (state.type === 'prompt' && !state.prompt && !state.prompt_file) {
      throw new Error(`Prompt state "${name}" must have a prompt or prompt_file field`);
    }

    if (state.type === 'choice' && !state.choices) {
      throw new Error(`Choice state "${name}" must have a choices field`);
    }
    
    if (state.type === 'workflow_ref' && !state.workflow_ref) {
      throw new Error(`Workflow reference state "${name}" must have a workflow_ref field`);
    }
    
    if (state.type === 'transition' && !state.next) {
      throw new Error(`Transition state "${name}" must have a next field`);
    }

    // Validate MCP server references
    if (state.mcp_servers) {
      if (!Array.isArray(state.mcp_servers)) {
        throw new Error(`State "${name}" mcp_servers must be an array`);
      }
      if (!mcpServers) {
        throw new Error(`State "${name}" references MCP servers but workflow has no mcp_servers defined`);
      }
      for (const serverName of state.mcp_servers) {
        if (!mcpServers[serverName]) {
          throw new Error(`State "${name}" references non-existent MCP server "${serverName}"`);
        }
      }
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
