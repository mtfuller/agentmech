const WorkflowParser = require('../../dist/core/workflow-parser');
const path = require('path');

describe('RAG Configuration Validation', () => {
  test('should parse workflow with RAG configuration', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/multi-rag-qa.yaml'));
    // multi-rag-qa.yaml has both default rag and named rags
    expect(workflow.rag).toBeDefined();
    expect(workflow.rag.directory).toBe('./examples/knowledge-base');
    expect(workflow.rags).toBeDefined();
    expect(workflow.rags.product_kb).toBeDefined();
    expect(workflow.rags.technical_kb).toBeDefined();
  });

  test('should validate RAG configuration with directory', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test RAG',
        start_state: 'test',
        rag: {
          directory: './knowledge'
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            use_rag: true,
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should detect missing RAG directory', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
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
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            use_rag: true,
            next: 'end'
          }
        }
      });
    }).toThrow();
  });

  test('should detect use_rag on non-prompt state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        rag: {
          directory: './knowledge'
        },
        states: {
          test: {
            type: 'choice',
            choices: [
              { label: 'Option', next: 'end' }
            ],
            use_rag: true
          }
        }
      });
    }).toThrow();
  });

  test('should accept valid RAG configuration with all options', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
        name: 'Test RAG',
        start_state: 'test',
        rag: {
          directory: './knowledge',
          model: 'gemma3:4b',
          embeddingsFile: 'embeddings.json',
          chunkSize: 1000,
          topK: 5
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            use_rag: true,
            next: 'end'
          }
        }
      });
    }).not.toThrow();
  });

  test('should accept inline RAG configuration in state', () => {
    expect(() => {
      WorkflowParser.validateWorkflow({
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
      WorkflowParser.validateWorkflow({
        name: 'Test Named RAG',
        start_state: 'test',
        rags: {
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
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        rags: {
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
      WorkflowParser.validateWorkflow({
        name: 'Test',
        start_state: 'test',
        rag: {
          directory: './knowledge'
        },
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test',
            rag: {
              directory: './docs'
            },
            use_rag: true,
            next: 'end'
          }
        }
      });
    }).toThrow();
  });
});

