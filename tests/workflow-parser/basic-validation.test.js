const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

describe('Basic Workflow Validation', () => {
  test('Parse valid workflow', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/simple-qa.yaml'));
    expect(workflow.name).toBe('Simple Q&A Workflow');
  });
  
  test('Validate workflow structure', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/story-generator.yaml'));
    expect(workflow.start_state).toBeDefined();
    expect(workflow.states[workflow.start_state]).toBeDefined();
  });
  
  test('Detect missing start_state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        states: { test: { type: 'end' } }
      });
    }).toThrow();
  });
  
  test('Detect invalid state type', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'invalid' } }
      });
    }).toThrow();
  });
  
  test('Detect missing prompt in prompt state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: { test: { type: 'prompt', next: 'end' }, end: { type: 'end' } }
      });
    }).toThrow();
  });
  
  test('Accept transition state type', () => {
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
