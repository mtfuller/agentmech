const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Steps Feature', () => {
  describe('Validation', () => {
    test('should accept valid steps configuration', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            steps: [
              { prompt: 'First prompt', save_as: 'result1' },
              { prompt: 'Second prompt', save_as: 'result2' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec)).not.toThrow();
    });

    test('should reject steps with less than 2 items', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            steps: [
              { prompt: 'Only one step' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec))
        .toThrow('steps must have at least 2 steps');
    });

    test('should reject steps with both prompt and prompt_file', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            steps: [
              { prompt: 'First', prompt_file: 'test.txt' },
              { prompt: 'Second' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec))
        .toThrow('cannot have both prompt and prompt_file');
    });

    test('should reject steps without prompt or prompt_file', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            steps: [
              { save_as: 'result1' },
              { prompt: 'Second' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec))
        .toThrow('must have a prompt or prompt_file field');
    });

    test('should reject state with both steps and prompt', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            prompt: 'Single prompt',
            steps: [
              { prompt: 'First' },
              { prompt: 'Second' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec))
        .toThrow('cannot have both steps and prompt');
    });

    test('should reject state with both steps and save_as', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            save_as: 'result',
            steps: [
              { prompt: 'First' },
              { prompt: 'Second' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec))
        .toThrow('cannot have both steps and save_as');
    });

    test('should reject steps on non-prompt/input state types', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'transition',
            steps: [
              { prompt: 'First' },
              { prompt: 'Second' }
            ],
            next: 'end'
          }
        }
      };
      
      expect(() => WorkflowValidator.validateWorkflowSpec(workflowSpec))
        .toThrow('can only use steps with prompt or input type states');
    });
  });

  describe('Parser Expansion', () => {
    test('should expand steps into separate states', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            steps: [
              { prompt: 'First prompt', save_as: 'result1' },
              { prompt: 'Second prompt', save_as: 'result2' },
              { prompt: 'Third prompt', save_as: 'result3' }
            ],
            next: 'end'
          }
        }
      };
      
      const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
        workflowSpec,
        workflowDir: '',
        filePath: '',
        visitedFiles: new Set()
      });
      
      // Should create 3 states: multi_step, multi_step_step_1, multi_step_step_2
      expect(workflow.states['multi_step']).toBeDefined();
      expect(workflow.states['multi_step_step_1']).toBeDefined();
      expect(workflow.states['multi_step_step_2']).toBeDefined();
      
      // First step uses original name and has correct prompt
      expect(workflow.states['multi_step'].prompt).toBe('First prompt');
      expect(workflow.states['multi_step'].saveAs).toBe('result1');
      expect(workflow.states['multi_step'].next).toBe('multi_step_step_1');
      
      // Second step
      expect(workflow.states['multi_step_step_1'].prompt).toBe('Second prompt');
      expect(workflow.states['multi_step_step_1'].saveAs).toBe('result2');
      expect(workflow.states['multi_step_step_1'].next).toBe('multi_step_step_2');
      
      // Third step transitions to end
      expect(workflow.states['multi_step_step_2'].prompt).toBe('Third prompt');
      expect(workflow.states['multi_step_step_2'].saveAs).toBe('result3');
      expect(workflow.states['multi_step_step_2'].next).toBe('end');
    });

    test('should inherit state-level properties in steps', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        default_model: 'gemma3:4b',
        states: {
          multi_step: {
            type: 'prompt',
            model: 'llama3:8b',
            options: { temperature: 0.7 },
            steps: [
              { prompt: 'First prompt' },
              { prompt: 'Second prompt' }
            ],
            next: 'end'
          }
        }
      };
      
      const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
        workflowSpec,
        workflowDir: '',
        filePath: '',
        visitedFiles: new Set()
      });
      
      // Both steps should inherit the model and options from parent state
      expect(workflow.states['multi_step'].model).toBe('llama3:8b');
      expect(workflow.states['multi_step'].options).toEqual({ temperature: 0.7 });
      expect(workflow.states['multi_step_step_1'].model).toBe('llama3:8b');
      expect(workflow.states['multi_step_step_1'].options).toEqual({ temperature: 0.7 });
    });

    test('should allow step-level properties to override state-level', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_step',
        states: {
          multi_step: {
            type: 'prompt',
            model: 'llama3:8b',
            steps: [
              { prompt: 'First prompt', model: 'gemma3:4b' },
              { prompt: 'Second prompt' }
            ],
            next: 'end'
          }
        }
      };
      
      const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
        workflowSpec,
        workflowDir: '',
        filePath: '',
        visitedFiles: new Set()
      });
      
      // First step overrides model
      expect(workflow.states['multi_step'].model).toBe('gemma3:4b');
      // Second step inherits from state
      expect(workflow.states['multi_step_step_1'].model).toBe('llama3:8b');
    });

    test('should handle input states with steps', () => {
      const workflowSpec = {
        name: 'Steps Test',
        start_state: 'multi_input',
        states: {
          multi_input: {
            type: 'input',
            steps: [
              { prompt: 'Enter your name', save_as: 'name' },
              { prompt: 'Enter your age', save_as: 'age' }
            ],
            next: 'end'
          }
        }
      };
      
      const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
        workflowSpec,
        workflowDir: '',
        filePath: '',
        visitedFiles: new Set()
      });
      
      expect(workflow.states['multi_input'].type).toBe('input');
      expect(workflow.states['multi_input'].prompt).toBe('Enter your name');
      expect(workflow.states['multi_input_step_1'].type).toBe('input');
      expect(workflow.states['multi_input_step_1'].prompt).toBe('Enter your age');
    });
  });
});
