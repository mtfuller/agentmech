/**
 * Integration test for custom tools workflow validation
 */

const WorkflowParser = require('../../dist/core/workflow-parser');
const path = require('path');

describe('Custom Tools Workflow Integration', () => {
  describe('Workflow Validation', () => {
    test('should parse and validate advanced-custom-tools workflow', () => {
      const workflowPath = path.join(__dirname, '../../examples/advanced-custom-tools.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Data Processing Assistant');
      expect(workflow.mcp_servers).toBeDefined();
      expect(workflow.mcp_servers.custom_tools).toBeDefined();
      // Parser expands simplified config to standard format
      // Either type: custom-tools or expanded command/args format is acceptable
      const mcpConfig = workflow.mcp_servers.custom_tools;
      const hasSimplifiedConfig = mcpConfig.type === 'custom-tools' && mcpConfig.toolsDirectory;
      const hasExpandedConfig = mcpConfig.command && mcpConfig.args;
      expect(hasSimplifiedConfig || hasExpandedConfig).toBeTruthy();
    });

    test('should parse and validate advanced-custom-tools workflow', () => {
      const workflowPath = path.join(__dirname, '../../examples/advanced-custom-tools.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Data Processing Assistant');
      expect(workflow.mcp_servers).toBeDefined();
      expect(workflow.mcp_servers.custom_tools).toBeDefined();
      expect(workflow.states).toBeDefined();
      expect(Object.keys(workflow.states).length).toBeGreaterThan(0);
    });

    test('should validate custom MCP server configuration', () => {
      const workflowPath = path.join(__dirname, '../../examples/advanced-custom-tools.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      const processDataState = workflow.states.process_data;
      expect(processDataState).toBeDefined();
      expect(processDataState.mcp_servers).toBeDefined();
      expect(processDataState.mcp_servers).toContain('custom_tools');
    });

    test('should handle workflow with custom tools MCP server reference', () => {
      const workflowPath = path.join(__dirname, '../../examples/advanced-custom-tools.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      // Check that states properly reference the custom_tools server
      const statesWithMcp = Object.values(workflow.states).filter(
        state => state.mcp_servers && state.mcp_servers.includes('custom_tools')
      );
      
      expect(statesWithMcp.length).toBeGreaterThan(0);
    });
  });

  describe('MCP Server Configuration Validation', () => {
    test('should accept valid custom tools MCP server config', () => {
      const workflowContent = `
name: "Test Workflow"
default_model: "gemma3:4b"
start_state: "test"

mcp_servers:
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "path/to/tools"]

states:
  test:
    type: "prompt"
    prompt: "Test"
    mcp_servers: ["custom_tools"]
    next: "end"
`;
      
      const yaml = require('js-yaml');
      const workflow = yaml.load(workflowContent);
      
      expect(() => {
        WorkflowParser.validateWorkflow(workflow);
      }).not.toThrow();
    });

    test('should detect invalid MCP server reference', () => {
      const workflowContent = `
name: "Test Workflow"
default_model: "gemma3:4b"
start_state: "test"

mcp_servers:
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "path/to/tools"]

states:
  test:
    type: "prompt"
    prompt: "Test"
    mcp_servers: ["nonexistent_server"]
    next: "end"
`;
      
      const yaml = require('js-yaml');
      const workflow = yaml.load(workflowContent);
      
      expect(() => {
        WorkflowParser.validateWorkflow(workflow);
      }).toThrow(/non-existent MCP server/);
    });
  });
});
