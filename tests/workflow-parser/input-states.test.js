const WorkflowParser = require('../../dist/workflow/parser');

describe('Input State Validation', () => {
  test('should accept valid input state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test Input',
        start_state: 'test',
        states: {
          test: {
            type: 'input',
            prompt: 'What is your name?',
            save_as: 'name',
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should detect missing prompt in input state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'input',
            save_as: 'value',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should accept input state with default value', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test Input with Default',
        start_state: 'test',
        states: {
          test: {
            type: 'input',
            prompt: 'Enter your location:',
            default_value: 'Earth',
            save_as: 'location',
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });
});

