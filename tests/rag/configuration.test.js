const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

/**
 * Test RAG (Retrieval-Augmented Generation) configuration validation
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testRagConfiguration() {
  console.log('Testing RAG Configuration Validation...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse workflow with RAG configuration
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/rag-qa.yaml'));
    if (workflow.rag && workflow.rag.directory === './examples/knowledge-base') {
      console.log('✓ Test 1 passed: Parse workflow with RAG configuration');
      passed++;
    } else {
      console.log('✗ Test 1 failed: RAG configuration not parsed correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Validate RAG configuration with required directory
  try {
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
    console.log('✓ Test 2 passed: Validate RAG configuration with directory');
    passed++;
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Detect missing RAG directory
  try {
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
    console.log('✗ Test 3 failed: Should detect missing RAG directory');
    failed++;
  } catch (error) {
    console.log('✓ Test 3 passed: Detect missing RAG directory');
    passed++;
  }
  
  // Test 4: Detect use_rag without RAG config
  try {
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
    console.log('✗ Test 4 failed: Should detect use_rag without RAG config');
    failed++;
  } catch (error) {
    console.log('✓ Test 4 passed: Detect use_rag without RAG config');
    passed++;
  }
  
  // Test 5: Detect use_rag on non-prompt state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      rag: {
        directory: './knowledge'
      },
      states: {
        test: {
          type: 'input',
          prompt: 'Enter something',
          use_rag: true
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 5 failed: Should detect use_rag on non-prompt state');
    failed++;
  } catch (error) {
    console.log('✓ Test 5 passed: Detect use_rag on non-prompt state');
    passed++;
  }
  
  // Test 6: Accept valid RAG configuration with all options
  try {
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
    console.log('✓ Test 6 passed: Accept valid RAG configuration with all options');
    passed++;
  } catch (error) {
    console.log('✗ Test 6 failed:', error.message);
    failed++;
  }
  
  // Test 7: Accept inline RAG configuration in state
  try {
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
    console.log('✓ Test 7 passed: Accept inline RAG configuration in state');
    passed++;
  } catch (error) {
    console.log('✗ Test 7 failed:', error.message);
    failed++;
  }
  
  // Test 8: Accept named RAG configurations
  try {
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
    console.log('✓ Test 8 passed: Accept named RAG configurations');
    passed++;
  } catch (error) {
    console.log('✗ Test 8 failed:', error.message);
    failed++;
  }
  
  // Test 9: Detect reference to non-existent named RAG
  try {
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
    console.log('✗ Test 9 failed: Should detect reference to non-existent named RAG');
    failed++;
  } catch (error) {
    console.log('✓ Test 9 passed: Detect reference to non-existent named RAG');
    passed++;
  }
  
  // Test 10: Detect conflicting inline rag and use_rag
  try {
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
    console.log('✗ Test 10 failed: Should detect conflicting inline rag and use_rag');
    failed++;
  } catch (error) {
    console.log('✓ Test 10 passed: Detect conflicting inline rag and use_rag');
    passed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = testRagConfiguration;
