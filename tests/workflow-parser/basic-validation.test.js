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
        states: { test: { type: 'end' } }
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
        states: { test: { type: 'prompt', next: 'end' }, end: { type: 'end' } }
      });
    }).toThrow();
  });

  test('should accept transition state type', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'transition',
            next: 'end'
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
});
