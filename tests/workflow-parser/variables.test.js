const WorkflowParser = require('../../dist/workflow/parser');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Workflow Variables', () => {
  test('should parse workflow with inline variables (shorthand)', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-inline-vars.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Variables',
      start_state: 'test',
      variables: {
        var1: 'value1',
        var2: 'value2'
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Hello {{var1}} and {{var2}}',
          next: 'end'
        }
      }
    }));
    
    try {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      expect(workflow.variables).toBeDefined();
      expect(workflow.variables.var1).toBe('value1');
      expect(workflow.variables.var2).toBe('value2');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should parse workflow with inline variables (object syntax)', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-object-vars.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Variables',
      start_state: 'test',
      variables: {
        var1: { value: 'value1' },
        var2: { value: 'value2' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Hello {{var1}} and {{var2}}',
          next: 'end'
        }
      }
    }));
    
    try {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      expect(workflow.variables).toBeDefined();
      expect(workflow.variables.var1).toBe('value1');
      expect(workflow.variables.var2).toBe('value2');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should parse workflow with file-based variables', () => {
    const tmpDir = path.join(__dirname, '../../examples/tmp-test-file-vars');
    const tmpWorkflow = path.join(tmpDir, 'workflow.yaml');
    const tmpVarFile = path.join(tmpDir, 'content.txt');
    
    // Create test directory and files
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(tmpVarFile, 'This is file content');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test File Variables',
      start_state: 'test',
      variables: {
        file_content: { file: 'content.txt' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Content: {{file_content}}',
          next: 'end'
        }
      }
    }));
    
    try {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      expect(workflow.variables).toBeDefined();
      expect(workflow.variables.file_content).toBe('This is file content');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('should parse workflow with mixed variable types', () => {
    const tmpDir = path.join(__dirname, '../../examples/tmp-test-mixed-vars');
    const tmpWorkflow = path.join(tmpDir, 'workflow.yaml');
    const tmpVarFile = path.join(tmpDir, 'file.txt');
    
    // Create test directory and files
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(tmpVarFile, 'file content');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Mixed Variables',
      start_state: 'test',
      variables: {
        inline: 'inline value',
        object: { value: 'object value' },
        file: { file: 'file.txt' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: '{{inline}} {{object}} {{file}}',
          next: 'end'
        }
      }
    }));
    
    try {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      expect(workflow.variables.inline).toBe('inline value');
      expect(workflow.variables.object).toBe('object value');
      expect(workflow.variables.file).toBe('file content');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('should handle missing variable file', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-missing-var-file.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Missing File',
      start_state: 'test',
      variables: {
        missing: { file: 'nonexistent.txt' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: '{{missing}}',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('Variable file not found');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should handle invalid variable definition', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-invalid-var.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Invalid Variable',
      start_state: 'test',
      variables: {
        invalid: { }  // No value or file property
      },
      states: {
        test: {
          type: 'prompt',
          prompt: '{{invalid}}',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('must have either "value" or "file" property');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should parse example variables-workflow.yaml', () => {
    const filePath = path.join(__dirname, '../../examples/variables-workflow.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    
    expect(workflow.variables).toBeDefined();
    expect(workflow.variables.user_name).toBe('Alice');
    expect(workflow.variables.topic).toBe('artificial intelligence');
    expect(workflow.variables.system_prompt).toContain('helpful assistant');
    expect(workflow.states.greet.prompt).toContain('{{system_prompt}}');
    expect(workflow.states.greet.prompt).toContain('{{user_name}}');
    expect(workflow.states.greet.prompt).toContain('{{topic}}');
  });
});
