#!/usr/bin/env node

/**
 * Custom MCP Server for loading and executing JavaScript tool functions
 * 
 * This server allows users to define custom tools as JavaScript functions
 * and use them in their workflows through the MCP protocol.
 * 
 * Usage:
 *   In workflow YAML:
 *   mcp_servers:
 *     custom_tools:
 *       command: "node"
 *       args: ["dist/custom-mcp-server.js", "path/to/tools-directory"]
 */

import * as fs from 'fs';
import * as path from 'path';

interface ToolFunction {
  name: string;
  description?: string;
  inputSchema?: any;
  execute: (args: any) => Promise<any> | any;
}

interface McpRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: any;
}

interface McpResponse {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class CustomMcpServer {
  private tools: Map<string, ToolFunction>;
  private toolsDirectory: string;

  constructor(toolsDirectory: string) {
    this.tools = new Map();
    this.toolsDirectory = path.resolve(toolsDirectory);
  }

  /**
   * Load all JavaScript files from the tools directory
   */
  async loadTools(): Promise<void> {
    if (!fs.existsSync(this.toolsDirectory)) {
      throw new Error(`Tools directory not found: ${this.toolsDirectory}`);
    }

    const files = fs.readdirSync(this.toolsDirectory);
    const jsFiles = files.filter(f => f.endsWith('.js'));

    for (const file of jsFiles) {
      const filePath = path.join(this.toolsDirectory, file);
      try {
        const toolModule = require(filePath);
        
        // Support both default export and named exports
        const toolFunction = toolModule.default || toolModule;
        
        if (typeof toolFunction === 'function') {
          // Single function export
          const toolName = path.basename(file, '.js');
          this.tools.set(toolName, {
            name: toolName,
            description: toolFunction.description || `Custom tool: ${toolName}`,
            inputSchema: toolFunction.inputSchema || {
              type: 'object',
              properties: {},
            },
            execute: toolFunction,
          });
        } else if (typeof toolFunction === 'object') {
          // Object with multiple tools or tool configuration
          if (toolFunction.name && toolFunction.execute) {
            // Single tool configuration object
            this.tools.set(toolFunction.name, {
              name: toolFunction.name,
              description: toolFunction.description,
              inputSchema: toolFunction.inputSchema,
              execute: toolFunction.execute,
            });
          } else {
            // Multiple tools exported as object properties
            for (const [key, value] of Object.entries(toolFunction)) {
              if (typeof value === 'function') {
                this.tools.set(key, {
                  name: key,
                  description: (value as any).description || `Custom tool: ${key}`,
                  inputSchema: (value as any).inputSchema || {
                    type: 'object',
                    properties: {},
                  },
                  execute: value as any,
                });
              } else if (typeof value === 'object' && (value as any).execute) {
                const tool = value as any;
                this.tools.set(key, {
                  name: key,
                  description: tool.description,
                  inputSchema: tool.inputSchema,
                  execute: tool.execute,
                });
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error loading tool from ${file}: ${error.message}`);
      }
    }

    console.info(`Loaded ${this.tools.size} custom tools from ${this.toolsDirectory}`);
  }

  /**
   * Handle MCP protocol messages
   */
  async handleRequest(request: McpRequest): Promise<McpResponse> {
    const response: McpResponse = {
      jsonrpc: '2.0',
      id: request.id,
    };

    try {
      switch (request.method) {
        case 'initialize':
          response.result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'custom-tools-server',
              version: '1.0.0',
            },
          };
          break;

        case 'tools/list':
          response.result = {
            tools: Array.from(this.tools.values()).map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
          };
          break;

        case 'tools/call':
          const toolName = request.params?.name;
          const toolArgs = request.params?.arguments || {};
          
          if (!toolName) {
            response.error = {
              code: -32602,
              message: 'Tool name is required',
            };
            break;
          }

          const tool = this.tools.get(toolName);
          if (!tool) {
            response.error = {
              code: -32601,
              message: `Tool not found: ${toolName}`,
            };
            break;
          }

          try {
            const result = await tool.execute(toolArgs);
            response.result = {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: `Tool execution failed: ${error.message}`,
              data: { error: error.stack },
            };
          }
          break;

        default:
          response.error = {
            code: -32601,
            message: `Method not found: ${request.method}`,
          };
      }
    } catch (error: any) {
      response.error = {
        code: -32603,
        message: `Internal error: ${error.message}`,
        data: { error: error.stack },
      };
    }

    return response;
  }

  /**
   * Start the server and listen for JSON-RPC messages on stdin
   */
  async start(): Promise<void> {
    await this.loadTools();

    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk.toString();
      
      // Process complete JSON-RPC messages (newline-delimited)
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        if (line.trim()) {
          try {
            const request = JSON.parse(line) as McpRequest;
            const response = await this.handleRequest(request);
            process.stdout.write(JSON.stringify(response) + '\n');
          } catch (error: any) {
            console.error(`Error processing request: ${error.message}`);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });

    console.error('Custom MCP Server started');
  }
}

// Main entry point
if (require.main === module) {
  const toolsDirectory = process.argv[2];
  
  if (!toolsDirectory) {
    console.error('Usage: node custom-mcp-server.js <tools-directory>');
    process.exit(1);
  }

  const server = new CustomMcpServer(toolsDirectory);
  server.start().catch(error => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });
}

export = CustomMcpServer;
