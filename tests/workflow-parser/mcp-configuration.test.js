const WorkflowParser = require('../../dist/workflow-parser');

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
      states: { test: { type: 'end' } }
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
        states: { test: { type: 'end' } }
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
          },
          end: { type: 'end' }
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
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
});

