/**
 * Tests for Custom MCP Server functionality
 */

const CustomMcpServer = require('../../dist/custom-mcp-server');
const path = require('path');
const fs = require('fs');

describe('Custom MCP Server', () => {
  let server;
  const testToolsDir = path.join(__dirname, '../../examples/custom-tools');

  beforeEach(() => {
    server = new CustomMcpServer(testToolsDir);
  });

  describe('Tool Loading', () => {
    test('should load JavaScript tools from directory', async () => {
      await server.loadTools();
      expect(server.tools.size).toBeGreaterThan(0);
    });

    test('should throw error if tools directory does not exist', async () => {
      const invalidServer = new CustomMcpServer('/nonexistent/path');
      await expect(invalidServer.loadTools()).rejects.toThrow('Tools directory not found');
    });
  });

  describe('MCP Protocol - Initialize', () => {
    test('should handle initialize request', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('custom-tools-server');
    });
  });

  describe('MCP Protocol - Tools List', () => {
    test('should list available tools', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBeGreaterThan(0);
      
      // Check that tools have required properties
      const tool = response.result.tools[0];
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    });

    test('should include calculator tool', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const response = await server.handleRequest(request);
      const calculatorTool = response.result.tools.find(t => t.name === 'calculator');
      
      expect(calculatorTool).toBeDefined();
      expect(calculatorTool.description).toContain('arithmetic');
      expect(calculatorTool.inputSchema.properties).toBeDefined();
      expect(calculatorTool.inputSchema.properties.operation).toBeDefined();
    });
  });

  describe('MCP Protocol - Tool Call', () => {
    test('should execute calculator tool - addition', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'calculator',
          arguments: {
            operation: 'add',
            a: 5,
            b: 3,
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content[0].type).toBe('text');
      
      const result = JSON.parse(response.result.content[0].text);
      expect(result.result).toBe(8);
    });

    test('should execute calculator tool - multiplication', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'calculator',
          arguments: {
            operation: 'multiply',
            a: 6,
            b: 7,
          },
        },
      };

      const response = await server.handleRequest(request);
      const result = JSON.parse(response.result.content[0].text);
      expect(result.result).toBe(42);
    });

    test('should execute text-transform tool - uppercase', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'text-transform',
          arguments: {
            operation: 'uppercase',
            text: 'hello world',
          },
        },
      };

      const response = await server.handleRequest(request);
      const result = JSON.parse(response.result.content[0].text);
      expect(result.result).toBe('HELLO WORLD');
    });

    test('should execute date-time tool - current', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'date-time',
          arguments: {
            operation: 'current',
          },
        },
      };

      const response = await server.handleRequest(request);
      const result = JSON.parse(response.result.content[0].text);
      expect(result.result).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
    });

    test('should return error for non-existent tool', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'nonexistent',
          arguments: {},
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toContain('Tool not found');
    });

    test('should return error when tool name is missing', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          arguments: {},
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('Tool name is required');
    });

    test('should handle tool execution errors', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'calculator',
          arguments: {
            operation: 'divide',
            a: 10,
            b: 0, // Division by zero
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32000);
      expect(response.error.message).toContain('Tool execution failed');
      expect(response.error.message).toContain('Division by zero');
    });
  });

  describe('MCP Protocol - Error Handling', () => {
    test('should return error for unknown method', async () => {
      await server.loadTools();
      const request = {
        jsonrpc: '2.0',
        id: 10,
        method: 'unknown/method',
      };

      const response = await server.handleRequest(request);
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toContain('Method not found');
    });
  });
});
