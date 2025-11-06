const WorkflowParser = require('../dist/workflow-parser');
const Tracer = require('../dist/tracer');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Test the WorkflowParser module
 * Validates workflow parsing, structure validation, and error detection
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testWorkflowParser() {
  console.log('Testing WorkflowParser...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse valid workflow
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/simple-qa.yaml'));
    if (workflow.name === 'Simple Q&A Workflow') {
      console.log('✓ Test 1 passed: Parse valid workflow');
      passed++;
    } else {
      console.log('✗ Test 1 failed: Workflow name mismatch');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Validate workflow structure
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/story-generator.yaml'));
    if (workflow.start_state && workflow.states[workflow.start_state]) {
      console.log('✓ Test 2 passed: Validate workflow structure');
      passed++;
    } else {
      console.log('✗ Test 2 failed: Invalid workflow structure');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Detect missing start_state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      states: { test: { type: 'end' } }
    });
    console.log('✗ Test 3 failed: Should detect missing start_state');
    failed++;
  } catch (error) {
    console.log('✓ Test 3 passed: Detect missing start_state');
    passed++;
  }
  
  // Test 4: Detect invalid state type
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: { test: { type: 'invalid' } }
    });
    console.log('✗ Test 4 failed: Should detect invalid state type');
    failed++;
  } catch (error) {
    console.log('✓ Test 4 passed: Detect invalid state type');
    passed++;
  }
  
  // Test 5: Detect missing prompt in prompt state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: { test: { type: 'prompt', next: 'end' }, end: { type: 'end' } }
    });
    console.log('✗ Test 5 failed: Should detect missing prompt');
    failed++;
  } catch (error) {
    console.log('✓ Test 5 passed: Detect missing prompt');
    passed++;
  }
  
  // Test 6: Validate MCP server configuration
  try {
    const workflow = {
      name: 'MCP Test',
      start_state: 'test',
      mcp_servers: {
        'test-server': {
          command: 'node',
          args: ['server.js'],
          env: { PORT: '3000' }
        }
      },
      states: { test: { type: 'end' } }
    };
    WorkflowParser.validateWorkflow(workflow);
    console.log('✓ Test 6 passed: Validate MCP server configuration');
    passed++;
  } catch (error) {
    console.log('✗ Test 6 failed:', error.message);
    failed++;
  }
  
  // Test 7: Detect invalid MCP server configuration (missing command)
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      mcp_servers: {
        'bad-server': {
          args: ['test.js']
        }
      },
      states: { test: { type: 'end' } }
    });
    console.log('✗ Test 7 failed: Should detect missing MCP server command');
    failed++;
  } catch (error) {
    console.log('✓ Test 7 passed: Detect missing MCP server command');
    passed++;
  }
  
  // Test 8: Detect invalid MCP server reference in state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      mcp_servers: {
        'server1': { command: 'node' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          mcp_servers: ['nonexistent-server'],
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 8 failed: Should detect invalid MCP server reference');
    failed++;
  } catch (error) {
    console.log('✓ Test 8 passed: Detect invalid MCP server reference');
    passed++;
  }
  
  // Test 9: Accept valid MCP server reference in state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      mcp_servers: {
        'server1': { command: 'node' }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          mcp_servers: ['server1'],
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 9 passed: Accept valid MCP server reference');
    passed++;
  } catch (error) {
    console.log('✗ Test 9 failed:', error.message);
    failed++;
  }
  
  // Test 10: Parse workflow with external prompt file
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/external-prompt-file.yaml'));
    if (workflow.states.generate_story.prompt && workflow.states.generate_story.prompt.includes('time traveler')) {
      console.log('✓ Test 10 passed: Parse workflow with external prompt file');
      passed++;
    } else {
      console.log('✗ Test 10 failed: External prompt file not loaded correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 10 failed:', error.message);
    failed++;
  }
  
  // Test 11: Parse workflow with workflow reference
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/workflow-reference.yaml'));
    // Should have imported states from greeting-workflow.yaml
    // The referenced workflow should have its states prefixed
    if (workflow.states['start_greeting_ref_greet'] && workflow.states['start_greeting_ref_greet'].type === 'prompt') {
      console.log('✓ Test 11 passed: Parse workflow with workflow reference');
      passed++;
    } else {
      console.log('✗ Test 11 failed: Workflow reference not imported correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 11 failed:', error.message);
    failed++;
  }
  
  // Test 12: Detect missing external prompt file
  try {
    const tmpWorkflow = path.join(__dirname, '../examples/tmp-test-missing-prompt.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt_file: 'nonexistent-file.md',
          next: 'end'
        },
        end: { type: 'end' }
      }
    }));
    try {
      WorkflowParser.parseFile(tmpWorkflow);
      console.log('✗ Test 12 failed: Should detect missing external prompt file');
      failed++;
    } catch (error) {
      if (error.message.includes('Prompt file not found')) {
        console.log('✓ Test 12 passed: Detect missing external prompt file');
        passed++;
      } else {
        console.log('✗ Test 12 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  } catch (error) {
    console.log('✗ Test 12 failed:', error.message);
    failed++;
  }
  
  // Test 13: Validate transition state type
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'transition',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 13 passed: Accept transition state type');
    passed++;
  } catch (error) {
    console.log('✗ Test 13 failed:', error.message);
    failed++;
  }
  
  // Test 14: Detect circular workflow references
  try {
    const tmpWorkflowA = path.join(__dirname, '../examples/tmp-test-circular-a.yaml');
    const tmpWorkflowB = path.join(__dirname, '../examples/tmp-test-circular-b.yaml');
    
    // Create workflow A that references B
    fs.writeFileSync(tmpWorkflowA, yaml.dump({
      name: 'Circular A',
      start_state: 'ref_b',
      states: {
        ref_b: {
          type: 'workflow_ref',
          workflow_ref: 'tmp-test-circular-b.yaml',
          next: 'end'
        },
        end: { type: 'end' }
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
        },
        end: { type: 'end' }
      }
    }));
    
    try {
      WorkflowParser.parseFile(tmpWorkflowA);
      console.log('✗ Test 14 failed: Should detect circular workflow references');
      failed++;
    } catch (error) {
      if (error.message.includes('Circular workflow reference')) {
        console.log('✓ Test 14 passed: Detect circular workflow references');
        passed++;
      } else {
        console.log('✗ Test 14 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpWorkflowA);
      fs.unlinkSync(tmpWorkflowB);
    }
  } catch (error) {
    console.log('✗ Test 14 failed:', error.message);
    failed++;
  }
  
  // Test 15: Detect conflicting prompt and prompt_file
  try {
    const tmpWorkflow = path.join(__dirname, '../examples/tmp-test-conflicting-prompt.yaml');
    fs.writeFileSync(tmpWorkflow, yaml.dump({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'inline prompt',
          prompt_file: 'prompts/story-prompt.md',
          next: 'end'
        },
        end: { type: 'end' }
      }
    }));
    try {
      WorkflowParser.parseFile(tmpWorkflow);
      console.log('✗ Test 15 failed: Should detect conflicting prompt and prompt_file');
      failed++;
    } catch (error) {
      if (error.message.includes('both prompt and prompt_file')) {
        console.log('✓ Test 15 passed: Detect conflicting prompt and prompt_file');
        passed++;
      } else {
        console.log('✗ Test 15 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  } catch (error) {
    console.log('✗ Test 15 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test RAG configuration validation
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testRagValidation() {
  console.log('\n\nTesting RAG Validation...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse workflow with RAG configuration
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/rag-qa.yaml'));
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
        model: 'llama2'
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
          type: 'choice',
          choices: [
            { label: 'Option', next: 'end' }
          ],
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
        model: 'llama2',
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

/**
 * Test the OllamaClient module
 * Note: Tests are skipped as they require a running Ollama instance
 * @returns {boolean} Always returns true
 */
function testOllamaClient() {
  console.log('\n\nTesting OllamaClient...\n');
  console.log('ℹ Skipping Ollama client tests (requires running Ollama instance)');
  console.log('  To test manually, run: ai-workflow list-models');
  return true;
}

// Run tests
console.log('=== Running Tests ===\n');
const parserPassed = testWorkflowParser();
const ragPassed = testRagValidation();
const ollamaPassed = testOllamaClient();

if (parserPassed && ragPassed && ollamaPassed) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
