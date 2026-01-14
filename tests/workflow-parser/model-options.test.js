const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');

describe('Model Options Validation', () => {
  test('should accept temperature option in state', () => {
    const spec = {
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'test prompt',
          options: {
            temperature: 0.7
          },
          next: 'end'
        }
      }
    };
    
    expect(() => WorkflowValidator.validateWorkflowSpec(spec)).not.toThrow();
  });

  test('should accept multiple options in state', () => {
    const spec = {
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'test prompt',
          options: {
            temperature: 1.2,
            top_p: 0.95,
            top_k: 40,
            repeat_penalty: 1.1,
            seed: 42,
            num_predict: 100
          },
          next: 'end'
        }
      }
    };
    
    expect(() => WorkflowValidator.validateWorkflowSpec(spec)).not.toThrow();
  });

  test('should accept options in steps', () => {
    const spec = {
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          steps: [
            {
              prompt: 'step 1',
              save_as: 'result1',
              options: {
                temperature: 1.5
              }
            },
            {
              prompt: 'step 2',
              save_as: 'result2',
              options: {
                temperature: 0.3
              }
            }
          ],
          next: 'end'
        }
      }
    };
    
    expect(() => WorkflowValidator.validateWorkflowSpec(spec)).not.toThrow();
  });

  test('should preserve options when parsing workflow from file', () => {
    const path = require('path');
    const filePath = path.join(__dirname, '../../examples/temperature-demo.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    
    // Check that creative_high_temp state has options
    expect(workflow.states.creative_high_temp.options).toBeDefined();
    expect(workflow.states.creative_high_temp.options.temperature).toBe(1.2);
    expect(workflow.states.creative_high_temp.options.top_p).toBe(0.95);
    
    // Check that deterministic_low_temp state has options
    expect(workflow.states.deterministic_low_temp.options).toBeDefined();
    expect(workflow.states.deterministic_low_temp.options.temperature).toBe(0.1);
    expect(workflow.states.deterministic_low_temp.options.top_p).toBe(0.9);
  });

  test('should accept empty options object', () => {
    const spec = {
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'test prompt',
          options: {},
          next: 'end'
        }
      }
    };
    
    expect(() => WorkflowValidator.validateWorkflowSpec(spec)).not.toThrow();
  });

  test('should work without options field', () => {
    const spec = {
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'test prompt',
          next: 'end'
        }
      }
    };
    
    expect(() => WorkflowValidator.validateWorkflowSpec(spec)).not.toThrow();
  });
});
