/**
 * Shared types for MCP Client implementations
 */

export interface McpServerConfig {
  command?: string;  // Optional for type-based configs, but always set after normalization
  args?: string[];
  env?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

/**
 * Interface for MCP Client implementations
 * Allows for both real and mock implementations
 */
export interface IMcpClient {
  registerServer(name: string, config: McpServerConfig): void;
  connectServer(name: string): Promise<void>;
  disconnectServer(name: string): Promise<void>;
  disconnectAll(): Promise<void>;
  getAvailableTools(serverNames?: string[]): Array<{ server: string; tool: McpTool }>;
  getAvailableResources(serverNames?: string[]): Array<{ server: string; resource: McpResource }>;
  isConnected(name: string): boolean;
  getConnectedServers(): string[];
}
