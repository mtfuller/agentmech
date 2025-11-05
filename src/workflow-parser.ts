import * as yaml from 'js-yaml';
import * as fs from 'fs';

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
  choices?: Choice[];
  next?: string;
  model?: string;
  save_as?: string;
  options?: Record<string, any>;
  mcp_servers?: string[];
  use_rag?: boolean;
}

interface Workflow {
  name: string;
  description?: string;
  start_state: string;
  default_model?: string;
  mcp_servers?: Record<string, McpServerConfig>;
  rag?: RagConfig;
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

    // Validate RAG configuration if present
    if (workflow.rag) {
      this.validateRagConfig(workflow.rag);
    }

    // Validate MCP servers configuration if present
    if (workflow.mcp_servers) {
      this.validateMcpServers(workflow.mcp_servers);
    }

    // Validate each state
    for (const [stateName, state] of Object.entries(workflow.states)) {
      this.validateState(stateName, state, workflow.states, workflow.mcp_servers, workflow.rag);
    }
  }

  /**
   * Validate RAG configuration
   * @param ragConfig - RAG configuration
   */
  static validateRagConfig(ragConfig: RagConfig): void {
    if (!ragConfig.directory) {
      throw new Error('RAG configuration must have a directory');
    }
    if (typeof ragConfig.directory !== 'string') {
      throw new Error('RAG directory must be a string');
    }
    if (ragConfig.model && typeof ragConfig.model !== 'string') {
      throw new Error('RAG model must be a string');
    }
    if (ragConfig.embeddingsFile && typeof ragConfig.embeddingsFile !== 'string') {
      throw new Error('RAG embeddingsFile must be a string');
    }
    if (ragConfig.chunkSize && (typeof ragConfig.chunkSize !== 'number' || ragConfig.chunkSize <= 0)) {
      throw new Error('RAG chunkSize must be a positive number');
    }
    if (ragConfig.topK && (typeof ragConfig.topK !== 'number' || ragConfig.topK <= 0)) {
      throw new Error('RAG topK must be a positive number');
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
   * @param ragConfig - RAG configuration if present
   */
  static validateState(name: string, state: State, allStates: Record<string, State>, mcpServers?: Record<string, McpServerConfig>, ragConfig?: RagConfig): void {
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

    // Validate RAG usage
    if (state.use_rag) {
      if (typeof state.use_rag !== 'boolean') {
        throw new Error(`State "${name}" use_rag must be a boolean`);
      }
      if (!ragConfig) {
        throw new Error(`State "${name}" uses RAG but workflow has no rag configuration defined`);
      }
      if (state.type !== 'prompt') {
        throw new Error(`State "${name}" can only use RAG with prompt type states`);
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
