const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const os = require('os');

describe('Tools Configuration', () => {
  test('should accept tools configuration with npm_package', () => {
    const workflow = {
      name: 'Tools Test',
      start_state: 'test',
      tools: {
        'filesystem': {
          npm_package: '@modelcontextprotocol/server-filesystem',
          args: ['/tmp']
        }
      },
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    expect(() => {
      WorkflowValidator.validateWorkflowSpec(workflow);
    }).not.toThrow();
  });

  test('should accept tools configuration with file_path', () => {
    const workflow = {
      name: 'Tools Test',
      start_state: 'test',
      tools: {
        'custom_tools': {
          file_path: 'examples/custom-tools'
        }
      },
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    expect(() => {
      WorkflowValidator.validateWorkflowSpec(workflow);
    }).not.toThrow();
  });

  test('should reject tools configuration without npm_package or file_path', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        tools: {
          'bad-tool': {
            args: ['/tmp']
          }
        },
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow(/must have either "npm_package" or "file_path" field/);
  });

  test('should reject tools configuration with both npm_package and file_path', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        tools: {
          'bad-tool': {
            npm_package: '@modelcontextprotocol/server-filesystem',
            file_path: 'examples/custom-tools'
          }
        },
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow(/cannot have both "npm_package" and "file_path" fields/);
  });

  test('should normalize npm_package to npx type configuration', () => {
    // Create a temporary workflow file
    const tmpDir = os.tmpdir();
    const workflowPath = path.join(tmpDir, 'test-tools-npm-workflow.yaml');
    const workflowContent = `
name: "Tools NPM Test"
start_state: "test"
tools:
  filesystem:
    npm_package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
states:
  test:
    type: "prompt"
    prompt: "test"
    next: "end"
`;
    fs.writeFileSync(workflowPath, workflowContent);
    
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: workflowPath, visitedFiles: new Set()});
    
    // Check that it was normalized to npx configuration
    expect(workflow.mcpServers.filesystem.command).toBe('npx');
    expect(workflow.mcpServers.filesystem.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem', '/tmp']);

    // Cleanup
    fs.unlinkSync(workflowPath);
  });

  test('should normalize file_path to custom-tools type configuration', () => {
    // Create a temporary workflow file
    const tmpDir = os.tmpdir();
    const workflowPath = path.join(tmpDir, 'test-tools-file-workflow.yaml');
    const workflowContent = `
name: "Tools File Test"
start_state: "test"
tools:
  custom_tools:
    file_path: "examples/custom-tools"
states:
  test:
    type: "prompt"
    prompt: "test"
    next: "end"
`;
    fs.writeFileSync(workflowPath, workflowContent);

    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: workflowPath, visitedFiles: new Set()});

    // Check that it was normalized to custom-tools configuration
    expect(workflow.mcpServers.custom_tools.command).toBe('node');
    expect(workflow.mcpServers.custom_tools.args).toHaveLength(2);
    expect(workflow.mcpServers.custom_tools.args[0]).toBe('dist/custom-mcp-server.js');
    expect(workflow.mcpServers.custom_tools.args[1]).toContain('custom-tools');

    // Cleanup
    fs.unlinkSync(workflowPath);
  });

  test('should allow both tools and mcp_servers, with mcp_servers taking precedence', () => {
    const workflow = {
      name: 'Mixed Config Test',
      start_state: 'test',
      tools: {
        'filesystem': {
          npm_package: '@modelcontextprotocol/server-filesystem',
          args: ['/tmp']
        }
      },
      mcp_servers: {
        'filesystem': {
          command: 'custom-command',
          args: ['arg1']
        }
      },
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    
    // Should not throw validation error
    expect(() => {
      WorkflowValidator.validateWorkflowSpec(workflow);
    }).not.toThrow();
  });

  test('should accept tools configuration with env variables', () => {
    const workflow = {
      name: 'Tools Env Test',
      start_state: 'test',
      tools: {
        'filesystem': {
          npm_package: '@modelcontextprotocol/server-filesystem',
          args: ['/tmp'],
          env: {
            MCP_LOG_LEVEL: 'info'
          }
        }
      },
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    expect(() => {
      WorkflowValidator.validateWorkflowSpec(workflow);
    }).not.toThrow();
  });

  test('should reference tools in states', () => {
    const workflow = {
      name: 'Tools Reference Test',
      start_state: 'test',
      tools: {
        'my_tool': {
          npm_package: '@modelcontextprotocol/server-filesystem',
          args: ['/tmp']
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test with tool',
          mcp_servers: ['my_tool'],
          next: 'end'
        }
      }
    };
    expect(() => {
      WorkflowValidator.validateWorkflowSpec(workflow);
    }).not.toThrow();
  });
});
