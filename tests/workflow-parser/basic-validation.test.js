const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const path = require('path');

describe('Basic Workflow Validation', () => {
  test('should parse valid workflow', () => {
    const filePath = path.join(__dirname, '../../examples/simple-qa.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    expect(workflow.name).toBe('Simple Q&A Workflow');
  });

  test('should validate workflow structure', () => {
    const filePath = path.join(__dirname, '../../examples/complete-story-builder.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    expect(workflow.startState).toBeDefined();
    expect(workflow.states[workflow.startState]).toBeDefined();
  });

  test('should detect missing start_state', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow();
  });

  test('should detect invalid state type', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'invalid' } }
      });
    }).toThrow();
  });

  test('should detect missing prompt in prompt state', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'prompt', next: 'end' } }
      });
    }).toThrow();
  });

  test('should validate transition state type', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'transition',
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should reject explicit end state definition', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: {
          test: { type: 'prompt', prompt: 'test', next: 'end' },
          end: { type: 'prompt', prompt: 'ending' }
        }
      });
    }).toThrow('"end" is a reserved state name');
  });

  test('should allow next: "end" without defining end state', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: {
          test: { type: 'prompt', prompt: 'test', next: 'end' }
        }
      });
    }).not.toThrow();
  });
});

