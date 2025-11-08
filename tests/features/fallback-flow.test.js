const WorkflowParser = require('../../dist/workflow/parser');
const path = require('path');

describe('Fallback Flow (Error Handling)', () => {
  test('should parse workflow with state-level fallback', () => {
    // Use mixed-fallback.yaml which demonstrates both state-level and workflow-level fallback
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/mixed-fallback.yaml'));
    expect(workflow.states.state_with_specific_fallback.on_error).toBe('specific_error_handler');
  });

  test('should parse workflow with workflow-level fallback', () => {
    // Use mixed-fallback.yaml which has workflow-level fallback
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/mixed-fallback.yaml'));
    expect(workflow.on_error).toBe('global_fallback');
  });

  test('should detect invalid state-level fallback reference', () => {
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
          }
        }
      });
    }).toThrow();
  });

  test('should detect invalid workflow-level fallback reference', () => {
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
          }
        }
      });
    }).toThrow();
  });

  test('should accept valid state-level fallback to end state', () => {
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
          }
        }
      });
    }).not.toThrow();
  });

  test('should accept valid workflow-level fallback', () => {
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
          }
        }
      });
    }).not.toThrow();
  });

  test('should parse workflow with mixed fallback configurations', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/mixed-fallback.yaml'));
    expect(workflow.on_error).toBe('global_fallback');
    expect(workflow.states.state_with_specific_fallback.on_error).toBe('specific_error_handler');
  });
});

