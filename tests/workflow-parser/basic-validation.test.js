const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

describe('Basic Workflow Validation', () => {
  test('should parse valid workflow', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/simple-qa.yaml'));
    expect(workflow.name).toBe('Simple Q&A Workflow');
  });

  test('should validate workflow structure', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/story-generator.yaml'));
    expect(workflow.start_state).toBeDefined();
    expect(workflow.states[workflow.start_state]).toBeDefined();
  });

  test('should detect missing start_state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        states: { test: { type: 'prompt', prompt: 'test', next: 'end' } }
      });
    }).toThrow();
  });

  test('should detect invalid state type', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'invalid' } }
      });
    }).toThrow();
  });

  test('should detect missing prompt in prompt state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'prompt', next: 'end' } }
      });
    }).toThrow();
  });

  test('should validate transition state type', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
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
      WorkflowParser.validateWorkflow({
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
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: { type: 'prompt', prompt: 'test', next: 'end' }
        }
      });
    }).not.toThrow();
  });
});

