/**
 * Integration test for custom tools workflow validation
 */

const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

describe('Custom Tools Workflow Integration', () => {
  describe('Workflow Validation', () => {
    test('should parse and validate custom-tools-demo workflow', () => {
      const workflowPath = path.join(__dirname, '../../examples/custom-tools-demo.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Custom Tools Demo');
      expect(workflow.mcp_servers).toBeDefined();
      expect(workflow.mcp_servers.custom_tools).toBeDefined();
      expect(workflow.mcp_servers.custom_tools.command).toBe('node');
      expect(workflow.mcp_servers.custom_tools.args).toContain('dist/custom-mcp-server.js');
      expect(workflow.mcp_servers.custom_tools.args).toContain('examples/custom-tools');
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
      const workflowPath = path.join(__dirname, '../../examples/custom-tools-demo.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      const performCalculationState = workflow.states.perform_calculation;
      expect(performCalculationState).toBeDefined();
      expect(performCalculationState.mcp_servers).toBeDefined();
      expect(performCalculationState.mcp_servers).toContain('custom_tools');
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
