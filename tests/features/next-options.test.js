const WorkflowParser = require('../../dist/workflow-parser');

describe('Next Options (LLM State Selection)', () => {
  test('should accept valid next_options configuration', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test Next Options',
        start_state: 'research',
        states: {
          research: {
            type: 'prompt',
            prompt: 'Research the topic',
            next_options: [
              { state: 'search_web', description: 'Search the web for more information' },
              { state: 'plan_research', description: 'Plan the research approach' }
            ]
          },
          search_web: {
            type: 'prompt',
            prompt: 'Search web',
            next: 'end'
          },
          plan_research: {
            type: 'prompt',
            prompt: 'Plan research',
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should detect next_options with less than 2 options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { state: 'end', description: 'Go to end' }
            ]
          }
        }
      });
    }).toThrow();
  });

  test('should detect missing state field in next_options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { description: 'Option 1' },
              { state: 'end', description: 'Option 2' }
            ]
          }
        }
      });
    }).toThrow();
  });

  test('should detect missing description field in next_options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { state: 'state1', description: 'Option 1' },
              { state: 'end' }
            ]
          },
          state1: {
            type: 'prompt',
            prompt: 'State 1',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should detect non-existent state reference in next_options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { state: 'state1', description: 'Option 1' },
              { state: 'nonexistent', description: 'Option 2' }
            ]
          },
          state1: {
            type: 'prompt',
            prompt: 'State 1',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should detect conflicting next and next_options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next: 'end',
            next_options: [
              { state: 'state1', description: 'Option 1' },
              { state: 'end', description: 'Option 2' }
            ]
          },
          state1: {
            type: 'prompt',
            prompt: 'State 1',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should detect next_options on non-prompt state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'choice',
            choices: [
              { label: 'Option', next: 'end' }
            ],
            next_options: [
              { state: 'state1', description: 'Option 1' },
              { state: 'end', description: 'Option 2' }
            ]
          },
          state1: {
            type: 'prompt',
            prompt: 'State 1',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should accept next_options with end state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { state: 'state1', description: 'Continue' },
              { state: 'end', description: 'Finish' }
            ]
          },
          state1: {
            type: 'prompt',
            prompt: 'State 1',
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should detect empty state string in next_options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { state: '', description: 'Empty state' },
              { state: 'end', description: 'Finish' }
            ]
          }
        }
      });
    }).toThrow();
  });

  test('should detect empty description string in next_options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            next_options: [
              { state: 'state1', description: '' },
              { state: 'end', description: 'Finish' }
            ]
          },
          state1: {
            type: 'prompt',
            prompt: 'State 1',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });
});

