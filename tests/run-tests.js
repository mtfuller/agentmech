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

/**
 * Test next_options (LLM-driven state selection) validation
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testNextOptionsValidation() {
  console.log('\n\nTesting Next Options Validation...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Accept valid next_options configuration
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test Next Options',
      start_state: 'research',
      states: {
        research: {
          type: 'prompt',
          prompt: 'Research the topic',
          next_options: [
            { state: 'search_web', description: 'Search the web for more information' },
            { state: 'plan_research', description: 'Plan the research approach' }
          ]
        },
        search_web: {
          type: 'prompt',
          prompt: 'Search web',
          next: 'end'
        },
        plan_research: {
          type: 'prompt',
          prompt: 'Plan research',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 1 passed: Accept valid next_options configuration');
    passed++;
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Detect next_options with less than 2 options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { state: 'end', description: 'Go to end' }
          ]
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 2 failed: Should detect next_options with less than 2 options');
    failed++;
  } catch (error) {
    console.log('✓ Test 2 passed: Detect next_options with less than 2 options');
    passed++;
  }
  
  // Test 3: Detect missing state field in next_options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { description: 'Option 1' },
            { state: 'end', description: 'Option 2' }
          ]
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 3 failed: Should detect missing state field in next_options');
    failed++;
  } catch (error) {
    console.log('✓ Test 3 passed: Detect missing state field in next_options');
    passed++;
  }
  
  // Test 4: Detect missing description field in next_options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { state: 'state1', description: 'Option 1' },
            { state: 'end' }
          ]
        },
        state1: {
          type: 'prompt',
          prompt: 'State 1',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 4 failed: Should detect missing description field in next_options');
    failed++;
  } catch (error) {
    console.log('✓ Test 4 passed: Detect missing description field in next_options');
    passed++;
  }
  
  // Test 5: Detect non-existent state reference in next_options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { state: 'state1', description: 'Option 1' },
            { state: 'nonexistent', description: 'Option 2' }
          ]
        },
        state1: {
          type: 'prompt',
          prompt: 'State 1',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 5 failed: Should detect non-existent state reference in next_options');
    failed++;
  } catch (error) {
    console.log('✓ Test 5 passed: Detect non-existent state reference in next_options');
    passed++;
  }
  
  // Test 6: Detect conflicting next and next_options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next: 'end',
          next_options: [
            { state: 'state1', description: 'Option 1' },
            { state: 'end', description: 'Option 2' }
          ]
        },
        state1: {
          type: 'prompt',
          prompt: 'State 1',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 6 failed: Should detect conflicting next and next_options');
    failed++;
  } catch (error) {
    console.log('✓ Test 6 passed: Detect conflicting next and next_options');
    passed++;
  }
  
  // Test 7: Detect next_options on non-prompt state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'choice',
          choices: [
            { label: 'Option', next: 'end' }
          ],
          next_options: [
            { state: 'state1', description: 'Option 1' },
            { state: 'end', description: 'Option 2' }
          ]
        },
        state1: {
          type: 'prompt',
          prompt: 'State 1',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 7 failed: Should detect next_options on non-prompt state');
    failed++;
  } catch (error) {
    console.log('✓ Test 7 passed: Detect next_options on non-prompt state');
    passed++;
  }
  
  // Test 8: Accept next_options with 'end' state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { state: 'state1', description: 'Continue' },
            { state: 'end', description: 'Finish' }
          ]
        },
        state1: {
          type: 'prompt',
          prompt: 'State 1',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 8 passed: Accept next_options with end state');
    passed++;
  } catch (error) {
    console.log('✗ Test 8 failed:', error.message);
    failed++;
  }
  
  // Test 9: Detect empty state string in next_options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { state: '', description: 'Empty state' },
            { state: 'end', description: 'Finish' }
          ]
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 9 failed: Should detect empty state string in next_options');
    failed++;
  } catch (error) {
    console.log('✓ Test 9 passed: Detect empty state string in next_options');
    passed++;
  }
  
  // Test 10: Detect empty description string in next_options
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next_options: [
            { state: 'state1', description: '' },
            { state: 'end', description: 'Finish' }
          ]
        },
        state1: {
          type: 'prompt',
          prompt: 'State 1',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 10 failed: Should detect empty description string in next_options');
    failed++;
  } catch (error) {
    console.log('✓ Test 10 passed: Detect empty description string in next_options');
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

/**
 * Test fallback flow functionality
 * Validates state-level and workflow-level error handling
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testFallbackFlow() {
  console.log('\n\nTesting Fallback Flow...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse workflow with state-level fallback
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/state-level-fallback.yaml'));
    if (workflow.states.risky_operation.on_error === 'error_handler') {
      console.log('✓ Test 1 passed: Parse workflow with state-level fallback');
      passed++;
    } else {
      console.log('✗ Test 1 failed: State-level fallback not parsed correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Parse workflow with workflow-level fallback
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/workflow-level-fallback.yaml'));
    if (workflow.on_error === 'global_error_handler') {
      console.log('✓ Test 2 passed: Parse workflow with workflow-level fallback');
      passed++;
    } else {
      console.log('✗ Test 2 failed: Workflow-level fallback not parsed correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Detect invalid state-level fallback reference
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          on_error: 'nonexistent_state',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 3 failed: Should detect invalid state-level fallback reference');
    failed++;
  } catch (error) {
    console.log('✓ Test 3 passed: Detect invalid state-level fallback reference');
    passed++;
  }
  
  // Test 4: Detect invalid workflow-level fallback reference
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      on_error: 'nonexistent_handler',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 4 failed: Should detect invalid workflow-level fallback reference');
    failed++;
  } catch (error) {
    console.log('✓ Test 4 passed: Detect invalid workflow-level fallback reference');
    passed++;
  }
  
  // Test 5: Accept valid state-level fallback to end state
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          on_error: 'end',
          next: 'success'
        },
        success: {
          type: 'prompt',
          prompt: 'Success',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 5 passed: Accept valid state-level fallback to end state');
    passed++;
  } catch (error) {
    console.log('✗ Test 5 failed:', error.message);
    failed++;
  }
  
  // Test 6: Accept valid workflow-level fallback
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      on_error: 'error_handler',
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test',
          next: 'end'
        },
        error_handler: {
          type: 'prompt',
          prompt: 'Error handling',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 6 passed: Accept valid workflow-level fallback');
    passed++;
  } catch (error) {
    console.log('✗ Test 6 failed:', error.message);
    failed++;
  }
  
  // Test 7: Parse mixed fallback workflow
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../examples/mixed-fallback.yaml'));
    if (workflow.on_error === 'global_fallback' && 
        workflow.states.state_with_specific_fallback.on_error === 'specific_error_handler') {
      console.log('✓ Test 7 passed: Parse workflow with mixed fallback configurations');
      passed++;
    } else {
      console.log('✗ Test 7 failed: Mixed fallback not parsed correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 7 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests
console.log('=== Running Tests ===\n');
const parserPassed = testWorkflowParser();
const ragPassed = testRagValidation();
const nextOptionsPassed = testNextOptionsValidation();
const ollamaPassed = testOllamaClient();
const fallbackPassed = testFallbackFlow();

if (parserPassed && ragPassed && ollamaPassed && nextOptionsPassed && fallbackPassed) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
