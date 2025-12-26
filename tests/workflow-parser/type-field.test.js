const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Workflow Type Field', () => {
  test('should accept workflow with type="workflow" and steps', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          { type: 'prompt', prompt: 'test step 1', save_as: 'result1' },
          { type: 'prompt', prompt: 'test step 2', save_as: 'result2' }
        ]
      });
    }).not.toThrow();
  });

  test('should reject workflow with type="workflow" but using states', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow('Workflow (type: "workflow") must have a steps array');
  });

  test('should accept agent with type="agent" and states', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Agent',
        type: 'agent',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).not.toThrow();
  });

  test('should reject agent with type="agent" but using steps', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Agent',
        type: 'agent',
        steps: [
          { type: 'prompt', prompt: 'test step', save_as: 'result' }
        ]
      });
    }).toThrow('Agent (type: "agent") must have a states object');
  });

  test('should accept agent without type (backward compatibility)', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).not.toThrow();
  });

  test('should accept workflow without explicit type if steps provided', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        steps: [
          { type: 'prompt', prompt: 'test step', save_as: 'result' }
        ]
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
    }).toThrow('Workflow type must be either "workflow" or "agent"');
  });

  test('should reject configuration with neither steps nor states', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        type: 'workflow'
      });
    }).toThrow('Workflow (type: "workflow") must have a steps array');
  });

  test('should parse workflow with steps into states', () => {
    const workflowSpec = {
      name: 'Test Workflow',
      type: 'workflow',
      steps: [
        { type: 'prompt', prompt: 'test step 1', save_as: 'result1' },
        { type: 'prompt', prompt: 'test step 2', save_as: 'result2' }
      ]
    };
    
    const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
      workflowSpec,
      workflowDir: '/tmp',
      filePath: '/tmp/test.yaml',
      visitedFiles: new Set()
    });
    
    expect(workflow.type).toBe('workflow');
    expect(workflow.startState).toBe('step_0');
    expect(workflow.states['step_0']).toBeDefined();
    expect(workflow.states['step_1']).toBeDefined();
    expect(workflow.states['step_0'].next).toBe('step_1');
    expect(workflow.states['step_1'].next).toBe('end');
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
