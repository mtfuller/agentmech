import { RAGConfig, RAGService } from '../rag/rag-service';

export interface NextOption {
  state: string;
  description: string;
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface State {
  type: string;
  prompt: string;
  workflowRef?: string;
  next?: string;
  nextOptions?: NextOption[];  // LLM-driven state selection
  model?: string;
  saveAs?: string;
  options?: Record<string, any>;
  mcpServers?: string[];
  useRag?: string;  // true for default, or name of rag config
  rag?: RAGConfig;  // inline RAG configuration
  defaultValue?: string;  // default value for input state
  onError?: string;  // Fallback state to transition to on error (state-level)
  files: string[];  // Array of file paths for multimodal inputs (images, PDFs, text files, etc.)
}

export interface Workflow {
  name: string;
  description: string;
  defaultModel: string;
  startState: string;
  states: Record<string, State>;
  mcpServers?: Record<string, McpServerConfig>;
  rag: Record<string, RAGConfig>;  // Named RAG configurations
  onError?: string;
}