const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const path = require('path');

describe('RAG Configuration Validation', () => {
  test('should parse workflow with RAG configuration', () => {
    const filePath = path.join(__dirname, '../../examples/multi-rag-qa.yaml');
    const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
    expect(workflow.rag).toBeDefined();
    expect(workflow.rag.product_kb).toBeDefined();
    expect(workflow.rag.technical_kb).toBeDefined();
  });

  test('should detect missing RAG directory', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        rag: {
          model: 'gemma3:4b'
        },
        states: {
          test: { type: 'end' }
        }
      });
    }).toThrow();
  });

  test('should detect use_rag without RAG config', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            use_rag: "wow",
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should detect use_rag on non-prompt state', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        rag: {
          "wow": {
            directory: './knowledge'
          }
        },
        states: {
          test: {
            type: 'choice',
            choices: [
              { label: 'Option', next: 'end' }
            ],
            use_rag: "wow"
          }
        }
      });
    }).toThrow();
  });

  test('should accept inline RAG configuration in state', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Inline RAG',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            rag: {
              directory: './docs'
            },
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should accept named RAG configurations', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test Named RAG',
        start_state: 'test',
        rag: {
          'docs': {
            directory: './docs'
          },
          'kb': {
            directory: './knowledge-base'
          }
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            use_rag: 'docs',
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should detect reference to non-existent named RAG', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        rag: {
          'docs': {
            directory: './docs'
          }
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            use_rag: 'kb',
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should detect conflicting inline rag and use_rag', () => {
    expect(() => {
      WorkflowValidator.validateWorkflowSpec({
        name: 'Test',
        start_state: 'test',
        rag: {
          'kb': {
            directory: './knowledge'
          }
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            rag: {
              directory: './docs'
            },
            use_rag: "kb",
            next: 'end'
          }
        }
      });
    }).toThrow();
  });
});

