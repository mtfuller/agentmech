const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');

describe('Workflow Conditional Branching', () => {
  test('should accept workflow with next_step', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          { type: 'prompt', prompt: 'step 0', save_as: 'result1', next_step: 2 },
          { type: 'prompt', prompt: 'step 1', save_as: 'result2' },
          { type: 'prompt', prompt: 'step 2', save_as: 'result3' }
        ]
      });
    }).not.toThrow();
  });

  test('should accept workflow with next_step_options', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          {
            type: 'prompt',
            prompt: 'Decide next step',
            save_as: 'decision',
            next_step_options: [
              { step: 1, description: 'Go to step 1' },
              { step: 2, description: 'Go to step 2' }
            ]
          },
          { type: 'prompt', prompt: 'step 1', save_as: 'result1' },
          { type: 'prompt', prompt: 'step 2', save_as: 'result2' }
        ]
      });
    }).not.toThrow();
  });

  test('should reject workflow with out of range next_step', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          { type: 'prompt', prompt: 'step 0', next_step: 5 },
          { type: 'prompt', prompt: 'step 1' }
        ]
      });
    }).toThrow('next_step 5 is out of range');
  });

  test('should reject workflow with negative next_step', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          { type: 'prompt', prompt: 'step 0', next_step: -1 },
          { type: 'prompt', prompt: 'step 1' }
        ]
      });
    }).toThrow('next_step -1 is out of range');
  });

  test('should reject workflow with both next_step and next_step_options', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          {
            type: 'prompt',
            prompt: 'step 0',
            next_step: 1,
            next_step_options: [
              { step: 1, description: 'Go to step 1' }
            ]
          },
          { type: 'prompt', prompt: 'step 1' }
        ]
      });
    }).toThrow('cannot have both "next_step" and "next_step_options"');
  });

  test('should reject next_step_options with less than 2 options', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          {
            type: 'prompt',
            prompt: 'step 0',
            next_step_options: [
              { step: 1, description: 'Only one option' }
            ]
          },
          { type: 'prompt', prompt: 'step 1' }
        ]
      });
    }).toThrow('next_step_options must have at least 2 options');
  });

  test('should reject next_step_options with out of range step', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          {
            type: 'prompt',
            prompt: 'step 0',
            next_step_options: [
              { step: 1, description: 'Valid step' },
              { step: 10, description: 'Invalid step' }
            ]
          },
          { type: 'prompt', prompt: 'step 1' }
        ]
      });
    }).toThrow('next_step_options references step 10 which is out of range');
  });

  test('should reject next_step_options on input step', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Workflow',
        type: 'workflow',
        steps: [
          {
            type: 'input',
            prompt: 'Enter value',
            next_step_options: [
              { step: 1, description: 'Option 1' },
              { step: 2, description: 'Option 2' }
            ]
          },
          { type: 'prompt', prompt: 'step 1' },
          { type: 'prompt', prompt: 'step 2' }
        ]
      });
    }).toThrow('can only use next_step_options with prompt type steps');
  });

  test('should parse workflow with next_step into correct states', () => {
    const workflowSpec = {
      name: 'Test Workflow',
      type: 'workflow',
      steps: [
        { type: 'prompt', prompt: 'step 0', save_as: 'result1', next_step: 2 },
        { type: 'prompt', prompt: 'step 1', save_as: 'result2' },
        { type: 'prompt', prompt: 'step 2', save_as: 'result3' }
      ]
    };
    
    const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
      workflowSpec,
      workflowDir: '/tmp',
      filePath: '/tmp/test.yaml',
      visitedFiles: new Set()
    });
    
    expect(workflow.states['step_0'].next).toBe('step_2');
    expect(workflow.states['step_1'].next).toBe('step_2');
    expect(workflow.states['step_2'].next).toBe('end');
  });

  test('should parse workflow with next_step_options into correct states', () => {
    const workflowSpec = {
      name: 'Test Workflow',
      type: 'workflow',
      steps: [
        {
          type: 'prompt',
          prompt: 'Decide',
          save_as: 'decision',
          next_step_options: [
            { step: 1, description: 'Go to step 1' },
            { step: 2, description: 'Go to step 2' }
          ]
        },
        { type: 'prompt', prompt: 'step 1', save_as: 'result1' },
        { type: 'prompt', prompt: 'step 2', save_as: 'result2' }
      ]
    };
    
    const workflow = WorkflowParser.parseWorkflowSpec(workflowSpec, {
      workflowSpec,
      workflowDir: '/tmp',
      filePath: '/tmp/test.yaml',
      visitedFiles: new Set()
    });
    
    expect(workflow.states['step_0'].next).toBeUndefined();
    expect(workflow.states['step_0'].nextOptions).toBeDefined();
    expect(workflow.states['step_0'].nextOptions.length).toBe(2);
    expect(workflow.states['step_0'].nextOptions[0].state).toBe('step_1');
    expect(workflow.states['step_0'].nextOptions[1].state).toBe('step_2');
  });
});
