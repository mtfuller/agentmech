const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

describe('Fallback Flow (Error Handling)', () => {
  test('Parse workflow with state-level fallback', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/state-level-fallback.yaml'));
    expect(workflow.states.risky_operation.on_error).toBe('error_handler');
  });
  
  test('Parse workflow with workflow-level fallback', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/workflow-level-fallback.yaml'));
    expect(workflow.on_error).toBe('global_error_handler');
  });
  
  test('Detect invalid state-level fallback reference', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            on_error: 'nonexistent_state',
            next: 'end'
          },
          end: { type: 'end' }
        }
      });
    }).toThrow();
  });
  
  test('Detect invalid workflow-level fallback reference', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        on_error: 'nonexistent_handler',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next: 'end'
          },
          end: { type: 'end' }
        }
      });
    }).toThrow();
  });
  
  test('Accept valid state-level fallback to end state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            on_error: 'end',
            next: 'success'
          },
          success: {
            type: 'prompt',
            prompt: 'Success',
            next: 'end'
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
  
  test('Accept valid workflow-level fallback', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        on_error: 'error_handler',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next: 'end'
          },
          error_handler: {
            type: 'prompt',
            prompt: 'Error handling',
            next: 'end'
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
  
  test('Parse workflow with mixed fallback configurations', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/mixed-fallback.yaml'));
    expect(workflow.on_error).toBe('global_fallback');
    expect(workflow.states.state_with_specific_fallback.on_error).toBe('specific_error_handler');
  });
});
