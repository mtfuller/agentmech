const WorkflowParser = require('../../dist/workflow-parser');

function testInputStates() {
  console.log('Testing Input State Validation...\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test Input',
      start_state: 'test',
      states: {
        test: {
          type: 'input',
          prompt: 'What is your name?',
          save_as: 'name',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 1 passed: Accept valid input state');
    passed++;
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test',
      start_state: 'test',
      states: {
        test: {
          type: 'input',
          save_as: 'value',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✗ Test 2 failed: Should detect missing prompt in input state');
    failed++;
  } catch (error) {
    console.log('✓ Test 2 passed: Detect missing prompt in input state');
    passed++;
  }
  
  try {
    WorkflowParser.validateWorkflow({
      name: 'Test Input with Default',
      start_state: 'test',
      states: {
        test: {
          type: 'input',
          prompt: 'Enter your location:',
          default_value: 'Earth',
          save_as: 'location',
          next: 'end'
        },
        end: { type: 'end' }
      }
    });
    console.log('✓ Test 3 passed: Accept input state with default value');
    passed++;
  } catch (error) {
    console.log('✗ Test 3 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = testInputStates;
