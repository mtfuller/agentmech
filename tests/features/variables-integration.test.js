const WorkflowParser = require('../../dist/workflow/parser');
const WorkflowExecutor = require('../../dist/workflow/executor');
const path = require('path');
const fs = require('fs');

describe('Variables Integration', () => {
  test('should initialize executor context with workflow variables', () => {
    const filePath = path.join(__dirname, '../../examples/variables-workflow.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    
    // Create executor (without running it)
    const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
    
    // Access context via the interpolateVariables method to verify variables are loaded
    const interpolated = executor.interpolateVariables('Hello {{user_name}}, topic: {{topic}}');
    
    expect(interpolated).toBe('Hello Alice, topic: artificial intelligence');
  });

  test('should interpolate file-based variables', () => {
    const filePath = path.join(__dirname, '../../examples/variables-workflow.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    
    const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
    
    const interpolated = executor.interpolateVariables('{{system_prompt}}');
    
    expect(interpolated).toContain('helpful assistant');
    expect(interpolated).toContain('technical documentation');
  });

  test('should preserve unknown variables during interpolation', () => {
    const filePath = path.join(__dirname, '../../examples/variables-workflow.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    
    const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
    
    const interpolated = executor.interpolateVariables('{{user_name}} and {{unknown_var}}');
    
    expect(interpolated).toBe('Alice and {{unknown_var}}');
  });

  test('should allow runtime variables to override workflow variables', () => {
    const tmpDir = path.join(__dirname, '../../examples/tmp-override-test');
    const tmpWorkflow = path.join(tmpDir, 'workflow.yaml');
    
    // Create test workflow
    fs.mkdirSync(tmpDir, { recursive: true });
    const yaml = require('js-yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Override Test',
      start_state: 'first',
      variables: {
        name: 'Original'
      },
      states: {
        first: {
          type: 'input',
          prompt: 'Enter your name:',
          save_as: 'name',
          next: 'second'
        },
        second: {
          type: 'prompt',
          prompt: 'Hello {{name}}!',
          next: 'end'
        }
      }
    }));
    
    try {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
      
      // Initially should use workflow variable
      let interpolated = executor.interpolateVariables('{{name}}');
      expect(interpolated).toBe('Original');
      
      // After setting runtime variable (simulating save_as), it should override
      executor.context.name = 'Runtime Value';
      interpolated = executor.interpolateVariables('{{name}}');
      expect(interpolated).toBe('Runtime Value');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
