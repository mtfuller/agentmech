import { MCPServerSpec, RAGSpec, StateSpec, WorkflowSpec } from "./spec";

const END_STATE = 'end';

export class WorkflowValidator {
  /**
   * Parse a workflow YAML file
   * @param filePath - Path to the YAML file
   * @param visitedFiles - Set of already visited files to detect cycles
   * @returns Parsed workflow object
   */
  static validateWorkflowSpec(workflow: WorkflowSpec): void {
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

    // Validate that "end" is not explicitly defined (it's a reserved state)
    if (workflow.states[END_STATE]) {
      throw new Error(`"${END_STATE}" is a reserved state name and cannot be explicitly defined. Remove the end state from your workflow.`);
    }

    // Validate named RAG configurations if present
    if (workflow.rag) {
      for (const [ragName, ragSpec] of Object.entries(workflow.rag)) {
        this.validateRAGSpec(ragSpec);
      }
    }

    // Validate each state
    for (const [stateName, state] of Object.entries(workflow.states)) {
      this.validateState(stateName, state, workflow.states, workflow.mcp_servers, workflow.rag);
    }

    // Validate MCP servers configuration if present
    if (workflow.mcp_servers) {
      this.validateMCPServers(workflow.mcp_servers);
    }

    // Validate workflow-level fallback state if present
    if (workflow.on_error) {
      if (!workflow.states[workflow.on_error] && workflow.on_error !== END_STATE) {
        throw new Error(`Workflow on_error references non-existent state "${workflow.on_error}"`);
      }
    }
  }

  /**
   * Validate a single state
   * @param name - State name
   * @param state - State configuration
   * @param allStates - All states for reference validation
   * @param mcpServers - MCP servers available in workflow
   * @param ragConfig - Default RAG configuration if present
   * @param namedRags - Named RAG configurations if present
   */
  static validateState(name: string, state: StateSpec, allStates: Record<string, StateSpec>, mcpServers?: Record<string, MCPServerSpec>, namedRags?: Record<string, RAGSpec>): void {
    if (!state.type) {
      throw new Error(`State "${name}" must have a type`);
    }

    const validTypes = ['prompt', 'input', 'workflow_ref', 'transition'];
    if (!validTypes.includes(state.type)) {
      throw new Error(`State "${name}" has invalid type "${state.type}". Must be one of: ${validTypes.join(', ')}`);
    }

    if (state.type === 'prompt' && !state.prompt && !state.prompt_file) {
      throw new Error(`Prompt state "${name}" must have a prompt or prompt_file field`);
    }

    if (state.type === 'input' && !state.prompt) {
      throw new Error(`Input state "${name}" must have a prompt field`);
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

    // Validate inline RAG configuration
    if (state.rag) {
      this.validateRAGSpec(state.rag);
      if (state.type !== 'prompt') {
        throw new Error(`State "${name}" can only use RAG with prompt type states`);
      }
    }

    // Validate RAG usage
    if (state.use_rag !== undefined) {
      if (state.type !== 'prompt') {
        throw new Error(`State "${name}" can only use RAG with prompt type states`);
      }

      // use_rag: "name" - references named rag config
      if (!namedRags || !namedRags[state.use_rag]) {
        throw new Error(`State "${name}" references non-existent RAG configuration "${state.use_rag}"`);
      }
    }

    // Check for conflicting RAG configurations
    if (state.rag && state.use_rag) {
      throw new Error(`State "${name}" cannot have both inline 'rag' and 'use_rag' configurations`);
    }

    // Validate state-level fallback state if present
    if (state.on_error) {
      if (!allStates[state.on_error] && state.on_error !== END_STATE) {
        throw new Error(`State "${name}" on_error references non-existent state "${state.on_error}"`);
      }
    }

    // Validate next_options (LLM-driven state selection)
    if (state.next_options) {
      if (!Array.isArray(state.next_options)) {
        throw new Error(`State "${name}" next_options must be an array`);
      }
      if (state.next_options.length < 2) {
        throw new Error(`State "${name}" next_options must have at least 2 options`);
      }
      for (const option of state.next_options) {
        if (!option.state || typeof option.state !== 'string' || option.state.trim() === '') {
          throw new Error(`State "${name}" next_options must have a non-empty 'state' field`);
        }
        if (!option.description || typeof option.description !== 'string' || option.description.trim() === '') {
          throw new Error(`State "${name}" next_options must have a non-empty 'description' field`);
        }
        if (!allStates[option.state] && option.state !== END_STATE) {
          throw new Error(`State "${name}" next_options references non-existent state "${option.state}"`);
        }
      }
      // Check for conflicting next and next_options
      if (state.next) {
        throw new Error(`State "${name}" cannot have both 'next' and 'next_options' fields`);
      }
      // next_options can only be used with prompt states (where LLM makes the decision)
      if (state.type !== 'prompt') {
        throw new Error(`State "${name}" can only use next_options with prompt type states`);
      }
    }

    // Validate transitions
    if (state.next && !allStates[state.next] && state.next !== END_STATE) {
      throw new Error(`State "${name}" references non-existent next state "${state.next}"`);
    }
  }


  /**
   * Validate MCP servers configuration
   * @param mcpServers - MCP servers configuration
   */
  static validateMCPServers(mcpServers: Record<string, MCPServerSpec>): void {
    for (const [serverName, config] of Object.entries(mcpServers)) {
      // Check if using simplified type configuration
      if (config.type) {
        if (config.type === 'npx') {
          if (!config.package || typeof config.package !== 'string') {
            throw new Error(`MCP server "${serverName}" with type "npx" must have a "package" field`);
          }
        } else if (config.type === 'custom-tools') {
          if (!config.tools_directory || typeof config.tools_directory !== 'string') {
            throw new Error(`MCP server "${serverName}" with type "custom-tools" must have a "tools_directory" field`);
          }
        } else {
          throw new Error(`MCP server "${serverName}" has invalid type "${config.type}". Must be "npx" or "custom-tools"`);
        }
      } else {
        // Standard configuration requires command
        if (!config.command) {
          throw new Error(`MCP server "${serverName}" must have a command`);
        }
        if (typeof config.command !== 'string') {
          throw new Error(`MCP server "${serverName}" command must be a string`);
        }
      }

      if (config.args && !Array.isArray(config.args)) {
        throw new Error(`MCP server "${serverName}" args must be an array`);
      }
      if (config.env && typeof config.env !== 'object') {
        throw new Error(`MCP server "${serverName}" env must be an object`);
      }
    }
  }

  static validateRAGSpec(ragSpec: RAGSpec): void {
    if (!ragSpec.directory) {
      throw new Error('RAG configuration must have a directory');
    }
    if (typeof ragSpec.directory !== 'string') {
      throw new Error('RAG directory must be a string');
    }
    if (ragSpec.model && typeof ragSpec.model !== 'string') {
      throw new Error('RAG model must be a string');
    }
    
    if (ragSpec.embeddings_file && typeof ragSpec.embeddings_file !== 'string') {
      throw new Error('RAG embeddings_file must be a string');
    }
    
    if (ragSpec.chunk_size && (typeof ragSpec.chunk_size !== 'number' || ragSpec.chunk_size <= 0)) {
      throw new Error('RAG chunk_size must be a positive number');
    }
    
    if (ragSpec.top_k && (typeof ragSpec.top_k !== 'number' || ragSpec.top_k <= 0)) {
      throw new Error('RAG top_k must be a positive number');
    }
  }
}