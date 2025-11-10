export interface WorkflowSpec {
  name: string;
  description?: string;
  default_model?: string;
  start_state: string;
  states: Record<string, StateSpec>;
  mcp_servers?: Record<string, MCPServerSpec>;
  rag?: Record<string, RAGSpec>;  // Named RAG configurations
  on_error?: string;  // Fallback state to transition to on error (workflow-level)
}

export interface StateSpec {
  type: string;
  prompt?: string;
  prompt_file?: string;
  workflow_ref?: string;
  next?: string;
  next_options?: {
    state: string;
    description: string;
  }[];
  model?: string;
  save_as?: string;
  options?: Record<string, any>;
  mcp_servers?: string[];
  use_rag?: string;  // true for default, or name of rag config
  rag?: RAGSpec;  // inline RAG configuration
  default_value?: string;  // default value for input state
  on_error?: string;  // Fallback state to transition to on error (state-level)
  files: string[];  // List of files to include in the state
}

export interface MCPServerSpec {
  type?: string;  // Optional type for simplified configs
  command?: string;  // Made optional when type is specified
  package?: string;  // For npx type: package name
  tools_directory?: string;  // For custom-tools type: directory path
  args?: string[];
  env?: Record<string, string>;
}

export interface RAGSpec {
  directory: string;
  model?: string;
  embeddings_file?: string;
  chunk_size?: number;
  top_k?: number;
  storage_format?: string;
}

