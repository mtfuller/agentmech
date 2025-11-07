import { spawn, ChildProcess } from 'child_process';
import Tracer = require('./tracer');

interface McpServerConfig {
  command?: string;  // Optional for type-based configs, but always set after normalization
  args?: string[];
  env?: Record<string, string>;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

class McpClient {
  private servers: Map<string, ChildProcess>;
  private serverConfigs: Map<string, McpServerConfig>;
  private serverTools: Map<string, McpTool[]>;
  private serverResources: Map<string, McpResource[]>;
  private tracer: Tracer;

  constructor(tracer?: Tracer) {
    this.servers = new Map();
    this.serverConfigs = new Map();
    this.serverTools = new Map();
    this.serverResources = new Map();
    this.tracer = tracer || new Tracer(false);
  }

  /**
   * Register an MCP server configuration
   * @param name - Server name
   * @param config - Server configuration
   */
  registerServer(name: string, config: McpServerConfig): void {
    this.serverConfigs.set(name, config);
    this.tracer.traceMcpServerRegister(name, config.command || 'unknown');
  }

  /**
   * Connect to a registered MCP server
   * @param name - Server name
   * @returns Promise that resolves when connection is established
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

    if (this.servers.has(name)) {
      // Already connected
      this.tracer.traceMcpServerConnect(name, true);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const env = {
          ...process.env,
          ...config.env
        };

        // At this point, config.command is guaranteed to be defined due to check above
        const command = config.command as string;

        const serverProcess = spawn(command, config.args || [], {
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        serverProcess.on('error', (error) => {
          const errorMsg = `Failed to start MCP server "${name}": ${error.message}`;
          this.tracer.traceMcpServerConnect(name, false, errorMsg);
          reject(new Error(errorMsg));
        });

        serverProcess.on('spawn', () => {
          this.servers.set(name, serverProcess);
          // Initialize empty tools and resources lists
          // Note: Full MCP protocol implementation for querying tools/resources
          // would require JSON-RPC communication over stdio, which is not yet implemented.
          // This provides the infrastructure for future MCP protocol integration.
          this.serverTools.set(name, []);
          this.serverResources.set(name, []);
          this.tracer.traceMcpServerConnect(name, true);
          resolve();
        });

        serverProcess.on('exit', (code) => {
          if (code !== 0) {
            console.warn(`MCP server "${name}" exited with code ${code}`);
          }
          this.servers.delete(name);
        });
      } catch (error: any) {
        const errorMsg = `Failed to connect to MCP server "${name}": ${error.message}`;
        this.tracer.traceMcpServerConnect(name, false, errorMsg);
        reject(new Error(errorMsg));
      }
    });
  }

  /**
   * Disconnect from an MCP server
   * @param name - Server name
   */
  async disconnectServer(name: string): Promise<void> {
    const serverProcess = this.servers.get(name);
    if (serverProcess) {
      serverProcess.kill();
      this.servers.delete(name);
      this.serverTools.delete(name);
      this.serverResources.delete(name);
      this.tracer.traceMcpServerDisconnect(name);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.servers.keys()).map(name => 
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
    const servers = serverNames || Array.from(this.servers.keys());
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
    const servers = serverNames || Array.from(this.servers.keys());
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
    return this.servers.has(name);
  }

  /**
   * Get list of connected servers
   * @returns Array of connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.servers.keys());
  }
}

export = McpClient;
