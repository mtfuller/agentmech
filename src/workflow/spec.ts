/**
 * Specification for a workflow configuration.
 * Represents the YAML structure for defining workflow execution.
 */
export interface WorkflowSpec {
  /** Name of the workflow */
  name: string;
  
  /** Optional description of the workflow's purpose */
  description?: string;
  
  /** Default model to use for LLM operations (can be overridden per state) */
  default_model?: string;
  
  /** Name of the state to begin workflow execution */
  start_state: string;
  
  /** Collection of states that define the workflow state machine */
  states: Record<string, StateSpec>;
  
  /** Optional MCP (Model Context Protocol) server configurations */
  mcp_servers?: Record<string, MCPServerSpec>;
  
  /** Optional named RAG (Retrieval-Augmented Generation) configurations */
  rag?: Record<string, RAGSpec>;
  
  /** Optional fallback state to transition to on error (workflow-level) */
  on_error?: string;
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
}

