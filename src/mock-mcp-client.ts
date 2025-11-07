import Tracer = require('./tracer');
import { IMcpClient, McpServerConfig, McpTool, McpResource } from './mcp-types';

/**
 * Mock MCP Client for testing
 * This client simulates MCP server functionality without spawning actual processes
 */
class MockMcpClient implements IMcpClient {
  private serverConfigs: Map<string, McpServerConfig>;
  private connectedServers: Set<string>;
  private serverTools: Map<string, McpTool[]>;
  private serverResources: Map<string, McpResource[]>;
  private tracer: Tracer;

  constructor(tracer?: Tracer) {
    this.serverConfigs = new Map();
    this.connectedServers = new Set();
    this.serverTools = new Map();
    this.serverResources = new Map();
    this.tracer = tracer || new Tracer(false);
  }

  /**
   * Register an MCP server configuration (mocked - doesn't spawn processes)
   * @param name - Server name
   * @param config - Server configuration
   */
  registerServer(name: string, config: McpServerConfig): void {
    this.serverConfigs.set(name, config);
    this.tracer.traceMcpServerRegister(name, config.command || 'unknown');
  }

  /**
   * Connect to a registered MCP server (mocked - doesn't spawn processes)
   * @param name - Server name
   * @returns Promise that resolves immediately
   */
  async connectServer(name: string): Promise<void> {
    const config = this.serverConfigs.get(name);
    if (!config) {
      const error = `MCP server "${name}" is not registered`;
      this.tracer.traceMcpServerConnect(name, false, error);
      throw new Error(error);
    }

    if (!config.command) {
      const error = `MCP server "${name}" has no command configured`;
      this.tracer.traceMcpServerConnect(name, false, error);
      throw new Error(error);
    }

    if (this.connectedServers.has(name)) {
      // Already connected
      this.tracer.traceMcpServerConnect(name, true);
      return;
    }

    // Mock connection - don't actually spawn process
    this.connectedServers.add(name);
    this.serverTools.set(name, []);
    this.serverResources.set(name, []);
    this.tracer.traceMcpServerConnect(name, true);
  }

  /**
   * Disconnect from an MCP server (mocked)
   * @param name - Server name
   */
  async disconnectServer(name: string): Promise<void> {
    if (this.connectedServers.has(name)) {
      this.connectedServers.delete(name);
      this.serverTools.delete(name);
      this.serverResources.delete(name);
      this.tracer.traceMcpServerDisconnect(name);
    }
  }

  /**
   * Disconnect from all MCP servers (mocked)
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connectedServers.keys()).map(name => 
      this.disconnectServer(name)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Get list of available tools from connected servers
   * @param serverNames - Names of servers to query (if empty, queries all)
   * @returns Array of available tools with server name
   */
  getAvailableTools(serverNames?: string[]): Array<{ server: string; tool: McpTool }> {
    const servers = serverNames || Array.from(this.connectedServers.keys());
    const tools: Array<{ server: string; tool: McpTool }> = [];

    for (const serverName of servers) {
      const serverTools = this.serverTools.get(serverName) || [];
      for (const tool of serverTools) {
        tools.push({ server: serverName, tool });
      }
    }

    return tools;
  }

  /**
   * Get list of available resources from connected servers
   * @param serverNames - Names of servers to query (if empty, queries all)
   * @returns Array of available resources with server name
   */
  getAvailableResources(serverNames?: string[]): Array<{ server: string; resource: McpResource }> {
    const servers = serverNames || Array.from(this.connectedServers.keys());
    const resources: Array<{ server: string; resource: McpResource }> = [];

    for (const serverName of servers) {
      const serverResources = this.serverResources.get(serverName) || [];
      for (const resource of serverResources) {
        resources.push({ server: serverName, resource });
      }
    }

    return resources;
  }

  /**
   * Check if a server is connected
   * @param name - Server name
   * @returns True if server is connected
   */
  isConnected(name: string): boolean {
    return this.connectedServers.has(name);
  }

  /**
   * Get list of connected servers
   * @returns Array of connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.connectedServers.keys());
  }
}

export = MockMcpClient;
