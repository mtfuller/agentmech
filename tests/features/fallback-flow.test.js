const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');

/**
 * Test fallback flow functionality
 * Validates state-level and workflow-level error handling
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testFallbackFlow() {
  console.log('Testing Fallback Flow (Error Handling)...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse workflow with state-level fallback
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/state-level-fallback.yaml'));
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
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/workflow-level-fallback.yaml'));
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
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/mixed-fallback.yaml'));
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

module.exports = testFallbackFlow;
