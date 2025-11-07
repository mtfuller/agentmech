import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const END_STATE = 'end';



interface NextOption {
  state: string;
  description: string;
}

interface McpServerConfig {
  type?: 'npx' | 'custom-tools';  // Optional type for simplified configs
  command?: string;  // Made optional when type is specified
  package?: string;  // For npx type: package name
  toolsDirectory?: string;  // For custom-tools type: directory path
  args?: string[];
  env?: Record<string, string>;
}

interface RagConfig {
  directory: string;
  model?: string;
  embeddings_file?: string;
  embeddingsFile?: string;  // Deprecated: use embeddings_file
  chunk_size?: number;
  chunkSize?: number;  // Deprecated: use chunk_size
  top_k?: number;
  topK?: number;  // Deprecated: use top_k
  storage_format?: 'json' | 'msgpack';
  storageFormat?: 'json' | 'msgpack';  // Deprecated: use storage_format
}

interface State {
  type: string;
  prompt?: string;
  prompt_file?: string;
  workflow_ref?: string;
  next?: string;
  next_options?: NextOption[];  // LLM-driven state selection
  model?: string;
  save_as?: string;
  options?: Record<string, any>;
  mcp_servers?: string[];
  use_rag?: boolean | string;  // true for default, or name of rag config
  rag?: RagConfig;  // inline RAG configuration
  default_value?: string;  // default value for input state
  on_error?: string;  // Fallback state to transition to on error (state-level)
}

interface Workflow {
  name: string;
  description?: string;
  start_state: string;
  default_model?: string;
  mcp_servers?: Record<string, McpServerConfig>;
  rag?: RagConfig;  // Backward compatibility: default RAG config
  rags?: Record<string, RagConfig>;  // Named RAG configurations
  on_error?: string;  // Fallback state to transition to on error (workflow-level)
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
      
      // Normalize MCP server configurations
      this.normalizeMcpServerConfigs(workflow, filePath);
      
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
   * Normalize MCP server configurations by converting simplified types to standard format
   * @param workflow - The workflow object
   * @param workflowFilePath - Path to the workflow file (for resolving relative paths)
   */
  static normalizeMcpServerConfigs(workflow: Workflow, workflowFilePath: string): void {
    if (!workflow.mcp_servers) {
      return;
    }

    const workflowDir = path.dirname(workflowFilePath);

    for (const [serverName, config] of Object.entries(workflow.mcp_servers)) {
      if (config.type === 'npx') {
        // NPX type: automatic npx invocation with package name
        if (!config.package) {
          throw new Error(`MCP server "${serverName}" with type "npx" must have a "package" field`);
        }

        // Convert to standard format
        const packageArgs = ['-y', config.package];
        if (config.args && config.args.length > 0) {
          packageArgs.push(...config.args);
        }

        config.command = 'npx';
        config.args = packageArgs;
        
        // Remove the type-specific fields after normalization
        delete config.type;
        delete config.package;
      } else if (config.type === 'custom-tools') {
        // Custom tools type: automatic path to custom-mcp-server.js
        if (!config.toolsDirectory) {
          throw new Error(`MCP server "${serverName}" with type "custom-tools" must have a "toolsDirectory" field`);
        }

        // Resolve tools directory relative to workflow file
        const resolvedToolsDir = path.resolve(workflowDir, config.toolsDirectory);
        
        // Basic validation to prevent obvious path traversal attempts
        // Note: This is a basic check. The OS-level permissions and spawn() security
        // provide the actual security boundary.
        const normalizedPath = path.normalize(resolvedToolsDir);
        if (normalizedPath.includes('..') && !path.isAbsolute(config.toolsDirectory)) {
          console.warn(`Warning: MCP server "${serverName}" uses relative path with '..' which may traverse directories: ${config.toolsDirectory}`);
        }

        // Convert to standard format
        // The custom-mcp-server.js is expected to be in dist/ from the project root
        // We use the standard location that's consistent with how the tool is distributed
        config.command = 'node';
        config.args = ['dist/custom-mcp-server.js', resolvedToolsDir];
        
        // Remove the type-specific fields after normalization
        delete config.type;
        delete config.toolsDirectory;
      }
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

    // Validate that "end" is not explicitly defined (it's a reserved state)
    if (workflow.states[END_STATE]) {
      throw new Error(`"${END_STATE}" is a reserved state name and cannot be explicitly defined. Remove the end state from your workflow.`);
    }

    // Validate RAG configuration if present
    if (workflow.rag) {
      this.validateRagConfig(workflow.rag);
    }

    // Validate named RAG configurations if present
    if (workflow.rags) {
      for (const [ragName, ragConfig] of Object.entries(workflow.rags)) {
        this.validateRagConfig(ragConfig);
      }
    }

    // Validate MCP servers configuration if present
    if (workflow.mcp_servers) {
      this.validateMcpServers(workflow.mcp_servers);
    }

    // Validate workflow-level fallback state if present
    if (workflow.on_error) {
      if (!workflow.states[workflow.on_error] && workflow.on_error !== END_STATE) {
        throw new Error(`Workflow on_error references non-existent state "${workflow.on_error}"`);
      }
    }

    // Validate each state
    for (const [stateName, state] of Object.entries(workflow.states)) {
      this.validateState(stateName, state, workflow.states, workflow.mcp_servers, workflow.rag, workflow.rags);
    }
  }

  /**
   * Normalize RAG configuration field names (support both old camelCase and new snake_case)
   * @param ragConfig - RAG configuration
   */
  static normalizeRagConfig(ragConfig: RagConfig): void {
    // Support both old (camelCase) and new (snake_case) field names
    // Warn about deprecated usage and normalize to new names
    if (ragConfig.embeddingsFile && !ragConfig.embeddings_file) {
      console.warn('Warning: "embeddingsFile" is deprecated. Please use "embeddings_file" instead.');
      ragConfig.embeddings_file = ragConfig.embeddingsFile;
    } else if (ragConfig.embeddings_file) {
      // Also set old name for backward compatibility in consumers
      ragConfig.embeddingsFile = ragConfig.embeddings_file;
    }
    
    if (ragConfig.chunkSize && !ragConfig.chunk_size) {
      console.warn('Warning: "chunkSize" is deprecated. Please use "chunk_size" instead.');
      ragConfig.chunk_size = ragConfig.chunkSize;
    } else if (ragConfig.chunk_size) {
      ragConfig.chunkSize = ragConfig.chunk_size;
    }
    
    if (ragConfig.topK && !ragConfig.top_k) {
      console.warn('Warning: "topK" is deprecated. Please use "top_k" instead.');
      ragConfig.top_k = ragConfig.topK;
    } else if (ragConfig.top_k) {
      ragConfig.topK = ragConfig.top_k;
    }
    
    if (ragConfig.storageFormat && !ragConfig.storage_format) {
      console.warn('Warning: "storageFormat" is deprecated. Please use "storage_format" instead.');
      ragConfig.storage_format = ragConfig.storageFormat;
    } else if (ragConfig.storage_format) {
      ragConfig.storageFormat = ragConfig.storage_format;
    }
  }

  /**
   * Validate RAG configuration
   * @param ragConfig - RAG configuration
   */
  static validateRagConfig(ragConfig: RagConfig): void {
    // First normalize field names
    this.normalizeRagConfig(ragConfig);

    if (!ragConfig.directory) {
      throw new Error('RAG configuration must have a directory');
    }
    if (typeof ragConfig.directory !== 'string') {
      throw new Error('RAG directory must be a string');
    }
    if (ragConfig.model && typeof ragConfig.model !== 'string') {
      throw new Error('RAG model must be a string');
    }
    
    // Validate using normalized (new) field names
    if (ragConfig.embeddings_file && typeof ragConfig.embeddings_file !== 'string') {
      throw new Error('RAG embeddings_file must be a string');
    }
    
    if (ragConfig.chunk_size && (typeof ragConfig.chunk_size !== 'number' || ragConfig.chunk_size <= 0)) {
      throw new Error('RAG chunk_size must be a positive number');
    }
    
    if (ragConfig.top_k && (typeof ragConfig.top_k !== 'number' || ragConfig.top_k <= 0)) {
      throw new Error('RAG top_k must be a positive number');
    }
  }

  /**
   * Validate MCP servers configuration
   * @param mcpServers - MCP servers configuration
   */
  static validateMcpServers(mcpServers: Record<string, McpServerConfig>): void {
    for (const [serverName, config] of Object.entries(mcpServers)) {
      // Check if using simplified type configuration
      if (config.type) {
        if (config.type === 'npx') {
          if (!config.package || typeof config.package !== 'string') {
            throw new Error(`MCP server "${serverName}" with type "npx" must have a "package" field`);
          }
        } else if (config.type === 'custom-tools') {
          if (!config.toolsDirectory || typeof config.toolsDirectory !== 'string') {
            throw new Error(`MCP server "${serverName}" with type "custom-tools" must have a "toolsDirectory" field`);
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

  /**
   * Validate a single state
   * @param name - State name
   * @param state - State configuration
   * @param allStates - All states for reference validation
   * @param mcpServers - MCP servers available in workflow
   * @param ragConfig - Default RAG configuration if present
   * @param namedRags - Named RAG configurations if present
   */
  static validateState(name: string, state: State, allStates: Record<string, State>, mcpServers?: Record<string, McpServerConfig>, ragConfig?: RagConfig, namedRags?: Record<string, RagConfig>): void {
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
      this.validateRagConfig(state.rag);
      if (state.type !== 'prompt') {
        throw new Error(`State "${name}" can only use RAG with prompt type states`);
      }
    }

    // Validate RAG usage
    if (state.use_rag !== undefined && state.use_rag !== false) {
      if (state.type !== 'prompt') {
        throw new Error(`State "${name}" can only use RAG with prompt type states`);
      }

      if (typeof state.use_rag === 'boolean') {
        // use_rag: true - requires default rag config
        if (state.use_rag && !ragConfig && !state.rag) {
          throw new Error(`State "${name}" uses RAG but workflow has no rag configuration defined`);
        }
      } else if (typeof state.use_rag === 'string') {
        // use_rag: "name" - references named rag config
        if (!namedRags || !namedRags[state.use_rag]) {
          throw new Error(`State "${name}" references non-existent RAG configuration "${state.use_rag}"`);
        }
      } else {
        throw new Error(`State "${name}" use_rag must be a boolean or string`);
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
}

export = WorkflowParser;
