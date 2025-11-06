const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

describe('RAG Configuration Validation', () => {
  test('Parse workflow with RAG configuration', () => {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/rag-qa.yaml'));
    expect(workflow.rag).toBeDefined();
    expect(workflow.rag.directory).toBe('./examples/knowledge-base');
  });
  
  test('Validate RAG configuration with directory', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
  
  test('Detect missing RAG directory', () => {
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
  
  test('Detect use_rag without RAG config', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).toThrow();
  });
  
  test('Detect use_rag on non-prompt state', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).toThrow();
  });
  
  test('Accept valid RAG configuration with all options', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
  
  test('Accept inline RAG configuration in state', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
  
  test('Accept named RAG configurations', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).not.toThrow();
  });
  
  test('Detect reference to non-existent named RAG', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).toThrow();
  });
  
  test('Detect conflicting inline rag and use_rag', () => {
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
          },
          end: { type: 'end' }
        }
      });
    }).toThrow();
  });
});
