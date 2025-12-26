/**
 * Specification for a workflow or agent configuration.
 * Represents the YAML structure for defining workflow/agent execution.
 * 
 * Workflow vs Agent:
 * - workflow: Linear and deterministic, walks through steps sequentially
 * - agent: Long-running and adaptable, operates in a precept-actuator loop with states
 */
export interface WorkflowSpec {
  /** Name of the workflow or agent */
  name: string;
  
  /** Optional description of the workflow's or agent's purpose */
  description?: string;
  
  /** 
   * Type of execution model: 'workflow' or 'agent'
   * - 'workflow': Linear and deterministic, uses steps for sequential execution
   * - 'agent': Long-running and adaptable, uses states for precept-actuator loops
   * Defaults to 'agent' for backward compatibility
   */
  type?: 'workflow' | 'agent';
  
  /** Default model to use for LLM operations (can be overridden per state) */
  default_model?: string;
  
  /** Name of the state to begin workflow/agent execution */
  start_state: string;
  
  /** Collection of states that define the workflow/agent state machine */
  states: Record<string, StateSpec>;
  
  /** Optional MCP (Model Context Protocol) server configurations */
  mcp_servers?: Record<string, MCPServerSpec>;
  
  /** Optional named RAG (Retrieval-Augmented Generation) configurations */
  rag?: Record<string, RAGSpec>;
  
  /** Optional variables that can be used in prompts with {{variable_name}} syntax */
  variables?: Record<string, VariableSpec>;
  
  /** Optional fallback state to transition to on error (workflow/agent-level) */
  on_error?: string;
}

/**
 * Specification for a single step within a state's steps array.
 * Steps allow sequential execution of multiple prompts within one state.
 */
export interface StepSpec {
  /** Inline prompt text (for prompt/input states) */
  prompt?: string;
  
  /** Path to external file containing prompt text (alternative to inline prompt) */
  prompt_file?: string;
  
  /** Variable name to store the step's output in workflow context */
  save_as?: string;
  
  /** Model to use for this step (overrides state and workflow default_model) */
  model?: string;
  
  /** Additional options to pass to the LLM (temperature, top_p, etc.) */
  options?: Record<string, any>;
  
  /** List of MCP server names to use for this step */
  mcp_servers?: string[];
  
  /** Name of RAG configuration to use for this step */
  use_rag?: string;
  
  /** Inline RAG configuration for this step (alternative to use_rag) */
  rag?: RAGSpec;
  
  /** List of file paths for multimodal inputs (images, PDFs, text files) */
  files?: string[];
  
  /** Default value for input steps (used if user provides no input) */
  default_value?: string;
}

/**
 * Specification for a single state within a workflow.
 * Defines the behavior and configuration for one step in the workflow.
 */
export interface StateSpec {
  /** Type of state: 'prompt' (LLM interaction), 'input' (user input), 'workflow_ref' (reference another workflow), or 'transition' (automatic transition) */
  type: string;
  
  /** Inline prompt text (for prompt/input states) */
  prompt?: string;
  
  /** Path to external file containing prompt text (alternative to inline prompt) */
  prompt_file?: string;
  
  /** Path to another workflow file to include as substates */
  workflow_ref?: string;
  
  /** Array of sequential steps to execute (alternative to single prompt) */
  steps?: StepSpec[];
  
  /** Name of the next state to transition to */
  next?: string;
  
  /** Array of possible next states with descriptions (for LLM-driven state selection) */
  next_options?: {
    state: string;
    description: string;
  }[];
  
  /** Model to use for this state (overrides workflow default_model) */
  model?: string;
  
  /** Variable name to store the state's output in workflow context */
  save_as?: string;
  
  /** Additional options to pass to the LLM (temperature, top_p, etc.) */
  options?: Record<string, any>;
  
  /** List of MCP server names to use for this state */
  mcp_servers?: string[];
  
  /** Name of RAG configuration to use for this state */
  use_rag?: string;
  
  /** Inline RAG configuration for this state (alternative to use_rag) */
  rag?: RAGSpec;
  
  /** Default value for input states (used if user provides no input) */
  default_value?: string;
  
  /** Fallback state to transition to on error (state-level override) */
  on_error?: string;
  
  /** List of file paths for multimodal inputs (images, PDFs, text files) */
  files: string[];
}

/**
 * Specification for an MCP (Model Context Protocol) server.
 * Supports multiple configuration formats for flexibility.
 */
export interface MCPServerSpec {
  /** Simplified configuration type: 'npx' for npm packages or 'custom-tools' for local tool directories */
  type?: string;
  
  /** Command to execute (required for standard config, optional when type is specified) */
  command?: string;
  
  /** NPM package name (required when type='npx') */
  package?: string;
  
  /** Path to tools directory (required when type='custom-tools') */
  tools_directory?: string;
  
  /** Command-line arguments to pass to the server */
  args?: string[];
  
  /** Environment variables to set for the server process */
  env?: Record<string, string>;
}

/**
 * Specification for a variable that can be used in prompts.
 * Variables can contain inline values or be loaded from files.
 */
export interface VariableSpec {
  /** Inline value for the variable */
  value?: string;
  
  /** Path to file containing the variable value (alternative to inline value) */
  file?: string;
}

/**
 * Specification for RAG (Retrieval-Augmented Generation) configuration.
 * Defines how to retrieve and use context from a knowledge base.
 */
export interface RAGSpec {
  /** Path to directory containing knowledge base documents */
  directory: string;
  
  /** Model to use for generating embeddings (defaults to workflow model) */
  model?: string;
  
  /** Path to file for storing/loading embeddings cache */
  embeddings_file?: string;
  
  /** Size of text chunks for embedding (in characters) */
  chunk_size?: number;
  
  /** Number of most relevant chunks to retrieve */
  top_k?: number;
  
  /** Storage format for embeddings: 'json' or 'msgpack' */
  storage_format?: string;
  
  /** 
   * Custom template for formatting RAG context chunks.
   * Available placeholders:
   * - {{prompt}} - the original user prompt
   * - {{chunks}} - all chunks formatted with chunk_template
   * - Use chunk_template to customize individual chunk formatting
   */
  context_template?: string;
  
  /**
   * Custom template for formatting individual RAG chunks.
   * Available placeholders:
   * - {{chunk.source}} - source file path
   * - {{chunk.text}} - chunk content
   * - {{chunk.id}} - chunk identifier
   * - {{index}} - 0-based chunk index
   * - {{number}} - 1-based chunk number
   */
  chunk_template?: string;
}

