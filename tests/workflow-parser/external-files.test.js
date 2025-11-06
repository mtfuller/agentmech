const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('External File Handling', () => {
  test('should parse workflow with external prompt file', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/external-prompt-file.yaml'));
    expect(workflow.states.generate_story.prompt).toBeDefined();
    expect(workflow.states.generate_story.prompt).toContain('time traveler');
  });

  test('should parse workflow with workflow reference', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/workflow-reference.yaml'));
    // Should have imported states from greeting-workflow.yaml
    // The referenced workflow should have its states prefixed
    expect(workflow.states['start_greeting_ref_greet']).toBeDefined();
    expect(workflow.states['start_greeting_ref_greet'].type).toBe('prompt');
  });

  test('should detect missing external prompt file', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-missing-prompt.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt_file: 'nonexistent-file.md',
          next: 'end'
        }
      }
    }));
    
    
    try {
      expect(() => {
        WorkflowParser.parseFile(tmpWorkflow);
      }).toThrow('Prompt file not found');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should detect circular workflow references', () => {
    const tmpWorkflowA = path.join(__dirname, '../../examples/tmp-test-circular-a.yaml');
    const tmpWorkflowB = path.join(__dirname, '../../examples/tmp-test-circular-b.yaml');
    
    // Create workflow A that references B
    fs.writeFileSync(tmpWorkflowA, yaml.dump({
      name: 'Circular A',
      start_state: 'ref_b',
      states: {
        ref_b: {
          type: 'workflow_ref',
          workflow_ref: 'tmp-test-circular-b.yaml',
          next: 'end'
        }
      }
    }));
    
    // Create workflow B that references A (creating a cycle)
    fs.writeFileSync(tmpWorkflowB, yaml.dump({
      name: 'Circular B',
      start_state: 'ref_a',
      states: {
        ref_a: {
          type: 'workflow_ref',
          workflow_ref: 'tmp-test-circular-a.yaml',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile(tmpWorkflowA);
      }).toThrow('Circular workflow reference');
    } finally {
      fs.unlinkSync(tmpWorkflowA);
      fs.unlinkSync(tmpWorkflowB);
    }
  });

  test('should detect conflicting prompt and prompt_file', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-conflicting-prompt.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'inline prompt',
          prompt_file: 'prompts/story-prompt.md',
          next: 'end'
        }
      }
    }));
    
    
    try {
      expect(() => {
        WorkflowParser.parseFile(tmpWorkflow);
      }).toThrow('both prompt and prompt_file');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });
});

