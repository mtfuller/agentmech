const WorkflowParser = require('../../dist/workflow/parser');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Variables Validation', () => {
  test('should accept valid variable names', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-valid-var-names.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Valid Variable Names',
      start_state: 'test',
      variables: {
        var1: 'value',
        _private: 'value',
        camelCase: 'value',
        snake_case: 'value',
        PascalCase: 'value',
        var123: 'value'
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      expect(workflow.variables).toBeDefined();
      expect(Object.keys(workflow.variables).length).toBe(6);
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should reject variable names starting with numbers', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-invalid-var-number.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Invalid Variable Name',
      start_state: 'test',
      variables: {
        '123var': 'value'
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('invalid name');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should reject variable names with special characters', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-invalid-var-special.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Invalid Variable Name',
      start_state: 'test',
      variables: {
        'var-name': 'value'
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('invalid name');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should reject variable with both value and file', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-both-value-file.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Both Value and File',
      start_state: 'test',
      variables: {
        var1: {
          value: 'inline',
          file: 'file.txt'
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('cannot have both "value" and "file"');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should reject variable with neither value nor file', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-no-value-file.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test No Value or File',
      start_state: 'test',
      variables: {
        var1: { }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('must have either "value" or "file"');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should reject variable with empty file path', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-empty-file.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Empty File Path',
      start_state: 'test',
      variables: {
        var1: { file: '  ' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('file path cannot be empty');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });

  test('should reject invalid variable type', () => {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-invalid-type.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test Invalid Variable Type',
      start_state: 'test',
      variables: {
        var1: 123  // Number instead of string or object
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'test',
          next: 'end'
        }
      }
    }));
    
    try {
      expect(() => {
        WorkflowParser.parseFile({workflowDir: '', filePath: tmpWorkflow, visitedFiles: new Set()});
      }).toThrow('must be a string or object');
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  });
});
