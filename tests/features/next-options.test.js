const WorkflowParser = require('../../dist/workflow-parser');

/**
 * Test next_options (LLM-driven state selection) validation
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testNextOptions() {
  console.log('Testing Next Options (LLM State Selection)...\n');
  
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

module.exports = testNextOptions;
