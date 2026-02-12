const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');

describe('Decision State Type', () => {
  describe('Validation', () => {
    test('should accept valid decision state with next_options', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'option2', description: 'Second option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).not.toThrow();
    });

    test('should reject decision state without next_options', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              next: 'end'
            }
          }
        });
      }).toThrow('must have a next_options');
    });

    test('should reject decision state with prompt', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              prompt: 'This should not be here',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'option2', description: 'Second option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).toThrow('cannot have a prompt');
    });

    test('should reject decision state with prompt_file', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              prompt_file: 'some-prompt.txt',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'option2', description: 'Second option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).toThrow('cannot have a prompt');
    });

    test('should reject decision state with both next and next_options', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              next: 'end',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'option2', description: 'Second option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).toThrow('cannot have both');
    });

    test('should reject decision state with less than 2 next_options', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              next_options: [
                { state: 'option1', description: 'Only one option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' }
          }
        });
      }).toThrow('must have at least 2 options');
    });

    test('should reject decision state with invalid state reference in next_options', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'nonexistent', description: 'Invalid option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' }
          }
        });
      }).toThrow('non-existent state');
    });

    test('should allow decision state to reference end state', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              next_options: [
                { state: 'continue', description: 'Continue workflow' },
                { state: 'end', description: 'End workflow' }
              ]
            },
            continue: { type: 'prompt', prompt: 'Continuing', next: 'end' }
          }
        });
      }).not.toThrow();
    });

    test('should allow decision state with model override', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              model: 'llama3:8b',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'option2', description: 'Second option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).not.toThrow();
    });

    test('should allow decision state with save_as', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide',
          states: {
            decide: {
              type: 'decision',
              save_as: 'decision_result',
              next_options: [
                { state: 'option1', description: 'First option' },
                { state: 'option2', description: 'Second option' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).not.toThrow();
    });
  });

  describe('Parser', () => {
    test('should parse workflow with decision state', () => {
      const workflowSpec = {
        name: 'Decision Test',
        start_state: 'decide',
        states: {
          decide: {
            type: 'decision',
            next_options: [
              { state: 'path_a', description: 'Take path A' },
              { state: 'path_b', description: 'Take path B' }
            ]
          },
          path_a: { type: 'prompt', prompt: 'Path A', next: 'end' },
          path_b: { type: 'prompt', prompt: 'Path B', next: 'end' }
        }
      };

      const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
        workflowSpec,
        workflowDir: '',
        filePath: '',
        visitedFiles: new Set()
      });

      expect(workflow.states.decide).toBeDefined();
      expect(workflow.states.decide.type).toBe('decision');
      expect(workflow.states.decide.nextOptions).toHaveLength(2);
      expect(workflow.states.decide.nextOptions[0].state).toBe('path_a');
      expect(workflow.states.decide.nextOptions[1].state).toBe('path_b');
    });
  });

  describe('Integration with other state types', () => {
    test('should allow decision state after prompt state', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'ask',
          states: {
            ask: {
              type: 'prompt',
              prompt: 'What would you like to do?',
              save_as: 'user_choice',
              next: 'decide'
            },
            decide: {
              type: 'decision',
              next_options: [
                { state: 'action1', description: 'Perform action 1' },
                { state: 'action2', description: 'Perform action 2' }
              ]
            },
            action1: { type: 'prompt', prompt: 'Action 1', next: 'end' },
            action2: { type: 'prompt', prompt: 'Action 2', next: 'end' }
          }
        });
      }).not.toThrow();
    });

    test('should allow decision state after input state', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'get_input',
          states: {
            get_input: {
              type: 'input',
              prompt: 'Enter your preference:',
              save_as: 'preference',
              next: 'decide'
            },
            decide: {
              type: 'decision',
              next_options: [
                { state: 'option1', description: 'Process preference one way' },
                { state: 'option2', description: 'Process preference another way' }
              ]
            },
            option1: { type: 'prompt', prompt: 'Option 1', next: 'end' },
            option2: { type: 'prompt', prompt: 'Option 2', next: 'end' }
          }
        });
      }).not.toThrow();
    });

    test('should allow chained decision states', () => {
      expect(() => {
        WorkflowValidator.validateWorkflowSpec({
          name: 'Test',
          start_state: 'decide1',
          states: {
            decide1: {
              type: 'decision',
              next_options: [
                { state: 'middle', description: 'Go to middle' },
                { state: 'end', description: 'End now' }
              ]
            },
            middle: {
              type: 'prompt',
              prompt: 'Middle step',
              next: 'decide2'
            },
            decide2: {
              type: 'decision',
              next_options: [
                { state: 'final', description: 'Continue to final' },
                { state: 'end', description: 'End here' }
              ]
            },
            final: { type: 'prompt', prompt: 'Final step', next: 'end' }
          }
        });
      }).not.toThrow();
    });
  });
});
