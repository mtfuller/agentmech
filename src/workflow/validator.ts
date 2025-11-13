import { MCPServerSpec, RAGSpec, StateSpec, StepSpec, WorkflowSpec } from "./spec";

const END_STATE = 'end';

export class WorkflowValidator {
  /**
   * Validate that a required field is present
   * @param value - Value to check
   * @param fieldName - Name of the field
   * @param context - Context for error message (e.g., "Workflow" or "State 'foo'")
   * @throws Error if value is missing
   */
  private static validateRequiredField(value: any, fieldName: string, context: string): void {
    if (!value) {
      throw new Error(`${context} must have a ${fieldName}`);
    }
  }

  /**
   * Validate that a field has the expected type
   * @param value - Value to check
   * @param expectedType - Expected JavaScript type ('string', 'object', 'number', etc.)
   * @param fieldName - Name of the field
   * @param context - Context for error message (e.g., "Workflow" or "State 'foo'")
   * @throws Error if type doesn't match
   */
  private static validateFieldType(value: any, expectedType: string, fieldName: string, context: string): void {
    if (typeof value !== expectedType) {
      throw new Error(`${context} ${fieldName} must be a ${expectedType}`);
    }
  }

  /**
   * Validate that a state reference exists
   * @param stateName - Name of the referenced state
   * @param allStates - All available states
   * @param fieldName - Name of the field containing the reference
   * @param context - Context for error message
   * @throws Error if state doesn't exist (unless it's the special END_STATE)
   */
  private static validateStateReference(stateName: string, allStates: Record<string, StateSpec>, fieldName: string, context: string): void {
    if (!allStates[stateName] && stateName !== END_STATE) {
      throw new Error(`${context} ${fieldName} references non-existent state "${stateName}"`);
    }
  }

  /**
   * Validate a workflow YAML specification
   * @param workflow - Workflow specification to validate
   * @throws Error if validation fails
   */
  static validateWorkflowSpec(workflow: WorkflowSpec): void {
    this.validateRequiredField(workflow, 'workflow', 'Configuration');
    this.validateRequiredField(workflow.name, 'name', 'Workflow');
    this.validateRequiredField(workflow.states, 'states object', 'Workflow');
    this.validateFieldType(workflow.states, 'object', 'states', 'Workflow');
    this.validateRequiredField(workflow.start_state, 'start_state', 'Workflow');
    this.validateStateReference(workflow.start_state, workflow.states, 'start_state', 'Workflow');

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

    // Validate variables if present
    if (workflow.variables) {
      this.validateVariables(workflow.variables);
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
    const stateContext = `State "${name}"`;
    
    this.validateRequiredField(state.type, 'type', stateContext);

    const validTypes = ['prompt', 'input', 'workflow_ref', 'transition', 'decision'];
    if (!validTypes.includes(state.type)) {
      throw new Error(`${stateContext} has invalid type "${state.type}". Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate steps configuration
    if (state.steps) {
      // Steps can only be used with prompt and input states
      if (state.type !== 'prompt' && state.type !== 'input') {
        throw new Error(`${stateContext} can only use steps with prompt or input type states`);
      }
      
      // If steps is defined, cannot have prompt or prompt_file at state level
      if (state.prompt || state.prompt_file) {
        throw new Error(`${stateContext} cannot have both steps and prompt/prompt_file fields`);
      }
      
      // If steps is defined, cannot have save_as at state level
      if (state.save_as) {
        throw new Error(`${stateContext} cannot have both steps and save_as fields. Use save_as within individual steps instead.`);
      }
      
      // Validate steps array
      if (!Array.isArray(state.steps)) {
        throw new Error(`${stateContext} steps must be an array`);
      }
      
      if (state.steps.length < 2) {
        throw new Error(`${stateContext} steps must have at least 2 steps (otherwise use a single prompt/input)`);
      }
      
      // Validate each step
      for (let i = 0; i < state.steps.length; i++) {
        this.validateStep(name, state.type, state.steps[i], i, mcpServers, namedRags);
      }
    }

    if (state.type === 'prompt' && !state.steps && !state.prompt && !state.prompt_file) {
      throw new Error(`Prompt state "${name}" must have a prompt, prompt_file, or steps field`);
    }

    if (state.type === 'prompt' && !state.steps && state.prompt && state.prompt_file) {
      throw new Error(`Prompt state "${name}" cannot have both prompt and prompt_file fields`);
    }

    if (state.type === 'input' && !state.steps) {
      this.validateRequiredField(state.prompt, 'prompt field', `Input state "${name}"`);
    }

    if (state.type === 'workflow_ref') {
      this.validateRequiredField(state.workflow_ref, 'workflow_ref field', `Workflow reference state "${name}"`);
    }

    if (state.type === 'transition') {
      this.validateRequiredField(state.next, 'next field', `Transition state "${name}"`);
    }

    if (state.type === 'decision') {
      this.validateRequiredField(state.next_options, 'next_options field', `Decision state "${name}"`);
      if (state.prompt || state.prompt_file) {
        throw new Error(`Decision state "${name}" cannot have a prompt or prompt_file field. Use a prompt state if you need to provide a new prompt.`);
      }
    }

    // Validate MCP server references
    if (state.mcp_servers) {
      if (!Array.isArray(state.mcp_servers)) {
        throw new Error(`${stateContext} mcp_servers must be an array`);
      }
      if (!mcpServers) {
        throw new Error(`${stateContext} references MCP servers but workflow has no mcp_servers defined`);
      }
      for (const serverName of state.mcp_servers) {
        if (!mcpServers[serverName]) {
          throw new Error(`${stateContext} references non-existent MCP server "${serverName}"`);
        }
      }
    }

    // Validate inline RAG configuration
    if (state.rag) {
      this.validateRAGSpec(state.rag);
      if (state.type !== 'prompt') {
        throw new Error(`${stateContext} can only use RAG with prompt type states`);
      }
    }

    // Validate RAG usage
    if (state.use_rag !== undefined) {
      if (state.type !== 'prompt') {
        throw new Error(`${stateContext} can only use RAG with prompt type states`);
      }

      // use_rag: "name" - references named rag config
      if (!namedRags || !namedRags[state.use_rag]) {
        throw new Error(`${stateContext} references non-existent RAG configuration "${state.use_rag}"`);
      }
    }

    // Check for conflicting RAG configurations
    if (state.rag && state.use_rag) {
      throw new Error(`${stateContext} cannot have both inline 'rag' and 'use_rag' configurations`);
    }

    // Validate state-level fallback state if present
    if (state.on_error) {
      this.validateStateReference(state.on_error, allStates, 'on_error', stateContext);
    }

    // Validate next_options (LLM-driven state selection)
    if (state.next_options) {
      if (!Array.isArray(state.next_options)) {
        throw new Error(`${stateContext} next_options must be an array`);
      }
      if (state.next_options.length < 2) {
        throw new Error(`${stateContext} next_options must have at least 2 options`);
      }
      for (const option of state.next_options) {
        if (!option.state || typeof option.state !== 'string' || option.state.trim() === '') {
          throw new Error(`${stateContext} next_options must have a non-empty 'state' field`);
        }
        if (!option.description || typeof option.description !== 'string' || option.description.trim() === '') {
          throw new Error(`${stateContext} next_options must have a non-empty 'description' field`);
        }
        this.validateStateReference(option.state, allStates, 'next_options', stateContext);
      }
      // Check for conflicting next and next_options
      if (state.next) {
        throw new Error(`${stateContext} cannot have both 'next' and 'next_options' fields`);
      }
      // next_options can only be used with prompt and decision states (where LLM makes the decision)
      if (state.type !== 'prompt' && state.type !== 'decision') {
        throw new Error(`${stateContext} can only use next_options with prompt or decision type states`);
      }
    }

    // Validate transitions
    if (state.next) {
      this.validateStateReference(state.next, allStates, 'next', stateContext);
    }
  }


  /**
   * Validate MCP servers configuration
   * @param mcpServers - MCP servers configuration
   */
  static validateMCPServers(mcpServers: Record<string, MCPServerSpec>): void {
    for (const [serverName, config] of Object.entries(mcpServers)) {
      const serverContext = `MCP server "${serverName}"`;
      
      // Check if using simplified type configuration
      if (config.type) {
        if (config.type === 'npx') {
          this.validateRequiredField(config.package, 'package field', `${serverContext} with type "npx"`);
          this.validateFieldType(config.package!, 'string', 'package', serverContext);
        } else if (config.type === 'custom-tools') {
          this.validateRequiredField(config.tools_directory, 'tools_directory field', `${serverContext} with type "custom-tools"`);
          this.validateFieldType(config.tools_directory!, 'string', 'tools_directory', serverContext);
        } else {
          throw new Error(`${serverContext} has invalid type "${config.type}". Must be "npx" or "custom-tools"`);
        }
      } else {
        // Standard configuration requires command
        this.validateRequiredField(config.command, 'command', serverContext);
        this.validateFieldType(config.command!, 'string', 'command', serverContext);
      }

      if (config.args && !Array.isArray(config.args)) {
        throw new Error(`${serverContext} args must be an array`);
      }
      if (config.env && typeof config.env !== 'object') {
        throw new Error(`${serverContext} env must be an object`);
      }
    }
  }

  static validateRAGSpec(ragSpec: RAGSpec): void {
    const ragContext = 'RAG configuration';
    
    this.validateRequiredField(ragSpec.directory, 'directory', ragContext);
    this.validateFieldType(ragSpec.directory, 'string', 'directory', ragContext);
    
    if (ragSpec.model) {
      this.validateFieldType(ragSpec.model, 'string', 'model', ragContext);
      const allowedEmbeddingModels = ['embeddinggemma', 'qwen3-embedding', 'all-minilm'];
      if (!allowedEmbeddingModels.includes(ragSpec.model)) {
        throw new Error(`RAG model must be one of: ${allowedEmbeddingModels.join(', ')}`);
      }
    }
    
    if (ragSpec.embeddings_file) {
      this.validateFieldType(ragSpec.embeddings_file, 'string', 'embeddings_file', ragContext);
    }
    
    if (ragSpec.chunk_size) {
      if (typeof ragSpec.chunk_size !== 'number' || ragSpec.chunk_size <= 0) {
        throw new Error('RAG chunk_size must be a positive number');
      }
    }
    
    if (ragSpec.top_k) {
      if (typeof ragSpec.top_k !== 'number' || ragSpec.top_k <= 0) {
        throw new Error('RAG top_k must be a positive number');
      }
    }
  }

  /**
   * Validate a single step within a state's steps array
   * @param stateName - Name of the parent state
   * @param stateType - Type of the parent state
   * @param step - Step configuration to validate
   * @param stepIndex - Index of this step in the steps array
   * @param mcpServers - MCP servers available in workflow
   * @param namedRags - Named RAG configurations if present
   */
  static validateStep(stateName: string, stateType: string, step: any, stepIndex: number, mcpServers?: Record<string, MCPServerSpec>, namedRags?: Record<string, RAGSpec>): void {
    const stepContext = `State "${stateName}" step ${stepIndex + 1}`;
    
    // Each step must have either prompt or prompt_file
    if (!step.prompt && !step.prompt_file) {
      throw new Error(`${stepContext} must have a prompt or prompt_file field`);
    }
    
    if (step.prompt && step.prompt_file) {
      throw new Error(`${stepContext} cannot have both prompt and prompt_file fields`);
    }
    
    // Validate MCP server references in step
    if (step.mcp_servers) {
      if (!Array.isArray(step.mcp_servers)) {
        throw new Error(`${stepContext} mcp_servers must be an array`);
      }
      if (!mcpServers) {
        throw new Error(`${stepContext} references MCP servers but workflow has no mcp_servers defined`);
      }
      for (const serverName of step.mcp_servers) {
        if (!mcpServers[serverName]) {
          throw new Error(`${stepContext} references non-existent MCP server "${serverName}"`);
        }
      }
    }
    
    // Validate inline RAG configuration in step
    if (step.rag) {
      this.validateRAGSpec(step.rag);
      if (stateType !== 'prompt') {
        throw new Error(`${stepContext} can only use RAG with prompt type states`);
      }
    }
    
    // Validate RAG usage in step
    if (step.use_rag !== undefined) {
      if (stateType !== 'prompt') {
        throw new Error(`${stepContext} can only use RAG with prompt type states`);
      }
      
      if (!namedRags || !namedRags[step.use_rag]) {
        throw new Error(`${stepContext} references non-existent RAG configuration "${step.use_rag}"`);
      }
    }
    
    // Check for conflicting RAG configurations
    if (step.rag && step.use_rag) {
      throw new Error(`${stepContext} cannot have both inline 'rag' and 'use_rag' configurations`);
    }
  }

  /**
   * Validate workflow variables configuration
   * @param variables - Variables configuration to validate
   */
  static validateVariables(variables: Record<string, any>): void {
    this.validateFieldType(variables, 'object', 'variables', 'Workflow');
    
    for (const [varName, varSpec] of Object.entries(variables)) {
      const varContext = `Variable "${varName}"`;
      
      // Variable names should be simple identifiers (alphanumeric and underscore)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        throw new Error(`${varContext} has invalid name. Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
      }
      
      // Handle shorthand string syntax
      if (typeof varSpec === 'string') {
        continue;
      }
      
      // Handle object syntax
      if (typeof varSpec === 'object' && varSpec !== null) {
        const hasValue = varSpec.value !== undefined;
        const hasFile = varSpec.file !== undefined;
        
        if (!hasValue && !hasFile) {
          throw new Error(`${varContext} must have either "value" or "file" property`);
        }
        
        if (hasValue && hasFile) {
          throw new Error(`${varContext} cannot have both "value" and "file" properties`);
        }
        
        if (hasFile) {
          this.validateFieldType(varSpec.file, 'string', 'file', varContext);
          if (varSpec.file.trim() === '') {
            throw new Error(`${varContext} file path cannot be empty`);
          }
        }
      } else {
        throw new Error(`${varContext} must be a string or object with "value" or "file" property`);
      }
    }
  }
}