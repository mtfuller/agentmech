const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Workflow Type Field', () => {
  test('should accept workflow with type="workflow"', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).not.toThrow();
  });

  test('should accept workflow with type="agent"', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Agent',
        type: 'agent',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).not.toThrow();
  });

  test('should accept workflow without type (backward compatibility)', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).not.toThrow();
  });

  test('should reject invalid type value', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        type: 'invalid',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow("Workflow type must be either 'workflow' or 'agent'");
  });

  test('should parse and preserve type field in workflow object', () => {
    const workflowSpec = {
      name: 'Test Workflow',
      type: 'workflow',
      start_state: 'test',
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    
    const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
      workflowSpec,
      workflowDir: '/tmp',
      filePath: '/tmp/test.yaml',
      visitedFiles: new Set()
    });
    
    expect(workflow.type).toBe('workflow');
  });

  test('should parse and preserve type="agent" in workflow object', () => {
    const workflowSpec = {
      name: 'Test Agent',
      type: 'agent',
      start_state: 'test',
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    
    const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
      workflowSpec,
      workflowDir: '/tmp',
      filePath: '/tmp/test.yaml',
      visitedFiles: new Set()
    });
    
    expect(workflow.type).toBe('agent');
  });

  test('should handle missing type field (undefined)', () => {
    const workflowSpec = {
      name: 'Test',
      start_state: 'test',
      states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
    };
    
    const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
      workflowSpec,
      workflowDir: '/tmp',
      filePath: '/tmp/test.yaml',
      visitedFiles: new Set()
    });
    
    expect(workflow.type).toBeUndefined();
  });

  test('should validate existing workflows from examples directory', () => {
    const examplesDir = path.join(__dirname, '../../examples');
    const yamlFiles = fs.readdirSync(examplesDir).filter(f => f.endsWith('.yaml') && !f.endsWith('.test.yaml'));
    
    yamlFiles.forEach(file => {
      const filePath = path.join(examplesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const workflowSpec = yaml.load(content);
      
      // Should not throw - existing workflows should still work
      expect(() => {
        WorkflowValidator.validateWorkflowSpec(workflowSpec);
      }).not.toThrow();
    });
  });
});
