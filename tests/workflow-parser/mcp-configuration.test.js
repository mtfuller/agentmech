const WorkflowParser = require('../../dist/workflow/parser');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const os = require('os');

describe('MCP Server Configuration', () => {
  test('should validate MCP server configuration', () => {
    const workflow = {
      name: 'MCP Test',
      start_state: 'test',
      mcp_servers: {
        'test-server': {
          command: 'node',
          args: ['server.js'],
          env: { PORT: '3000' }
        }
      },
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    expect(() => {
      WorkflowParser.validateWorkflow(workflow);
    }).not.toThrow();
  });

  test('should detect invalid MCP server configuration (missing command)', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        mcp_servers: {
          'bad-server': {
            args: ['test.js']
          }
        },
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow();
  });

  test('should detect invalid MCP server reference in state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        mcp_servers: {
          'server1': { command: 'node' }
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            mcp_servers: ['nonexistent-server'],
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should accept valid MCP server reference in state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        mcp_servers: {
          'server1': { command: 'node' }
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            mcp_servers: ['server1'],
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  describe('NPX Type Configuration', () => {
    test('should accept NPX type configuration with package', () => {
      const workflow = {
        name: 'NPX Test',
        start_state: 'test',
        mcp_servers: {
          'filesystem': {
            type: 'npx',
            package: '@modelcontextprotocol/server-filesystem',
            args: ['/tmp']
          }
        },
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      };
      expect(() => {
        WorkflowParser.validateWorkflow(workflow);
      }).not.toThrow();
    });

    test('should reject NPX type configuration without package', () => {
      expect(() => {
        WorkflowParser.validateWorkflow({
          name: 'Test',
          start_state: 'test',
          mcp_servers: {
            'bad-npx': {
              type: 'npx'
            }
          },
          states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
        });
      }).toThrow(/must have a "package" field/);
    });

    test('should normalize NPX type to standard command format', () => {
      // Create a temporary workflow file
      const tmpDir = os.tmpdir();
      const workflowPath = path.join(tmpDir, 'test-npx-workflow.yaml');
      const workflowContent = `
name: "NPX Test"
start_state: "test"
mcp_servers:
  filesystem:
    type: "npx"
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
states:
  test:
    type: "prompt"
    prompt: "test"
    next: "end"
`;
      fs.writeFileSync(workflowPath, workflowContent);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      // Check that it was normalized
      expect(workflow.mcpServers.filesystem.command).toBe('npx');
      expect(workflow.mcpServers.filesystem.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem', '/tmp']);
      expect(workflow.mcpServers.filesystem.type).toBeUndefined();
      expect(workflow.mcpServers.filesystem.package).toBeUndefined();

      // Cleanup
      fs.unlinkSync(workflowPath);
    });
  });

  describe('Custom Tools Type Configuration', () => {
    test('should accept custom-tools type configuration with toolsDirectory', () => {
      const workflow = {
        name: 'Custom Tools Test',
        start_state: 'test',
        mcp_servers: {
          'custom_tools': {
            type: 'custom-tools',
            toolsDirectory: 'examples/custom-tools'
          }
        },
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      };
      expect(() => {
        WorkflowParser.validateWorkflow(workflow);
      }).not.toThrow();
    });

    test('should reject custom-tools type configuration without toolsDirectory', () => {
      expect(() => {
        WorkflowParser.validateWorkflow({
          name: 'Test',
          start_state: 'test',
          mcp_servers: {
            'bad-custom': {
              type: 'custom-tools'
            }
          },
          states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
        });
      }).toThrow(/must have a "toolsDirectory" field/);
    });

    test('should normalize custom-tools type to standard command format', () => {
      // Create a temporary workflow file
      const tmpDir = os.tmpdir();
      const workflowPath = path.join(tmpDir, 'test-custom-tools-workflow.yaml');
      const workflowContent = `
name: "Custom Tools Test"
start_state: "test"
mcp_servers:
  custom_tools:
    type: "custom-tools"
    toolsDirectory: "examples/custom-tools"
states:
  test:
    type: "prompt"
    prompt: "test"
    next: "end"
`;
      fs.writeFileSync(workflowPath, workflowContent);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      // Check that it was normalized
      expect(workflow.mcpServers.custom_tools.command).toBe('node');
      expect(workflow.mcpServers.custom_tools.args).toHaveLength(2);
      expect(workflow.mcpServers.custom_tools.args[0]).toBe('dist/custom-mcp-server.js');
      // Second arg should be the resolved absolute path to the tools directory
      expect(workflow.mcpServers.custom_tools.args[1]).toContain('custom-tools');
      expect(workflow.mcpServers.custom_tools.type).toBeUndefined();
      expect(workflow.mcpServers.custom_tools.toolsDirectory).toBeUndefined();

      // Cleanup
      fs.unlinkSync(workflowPath);
    });

    test('should reject invalid type value', () => {
      expect(() => {
        WorkflowParser.validateWorkflow({
          name: 'Test',
          start_state: 'test',
          mcp_servers: {
            'invalid': {
              type: 'invalid-type'
            }
          },
          states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
        });
      }).toThrow(/invalid type/);
    });
  });
});

