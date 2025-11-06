const TestScenarioParser = require('../../dist/test-scenario-parser').TestScenarioParser;
const path = require('path');

/**
 * Test test scenario parsing and validation
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testTestScenarios() {
  console.log('Testing Test Scenario Parser...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse valid test scenario file
  try {
    const testSuite = TestScenarioParser.parseFile(
      path.join(__dirname, '../../examples/user-input-demo.test.yaml')
    );
    if (testSuite.workflow === 'user-input-demo.yaml' && testSuite.test_scenarios.length > 0) {
      console.log('✓ Test 1 passed: Parse valid test scenario file');
      passed++;
    } else {
      console.log('✗ Test 1 failed: Invalid test suite structure');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Detect missing workflow field
  try {
    TestScenarioParser.validateTestSuite({
      test_scenarios: [
        { name: 'Test', assertions: [{ type: 'state_reached', value: 'end' }] }
      ]
    });
    console.log('✗ Test 2 failed: Should detect missing workflow field');
    failed++;
  } catch (error) {
    console.log('✓ Test 2 passed: Detect missing workflow field');
    passed++;
  }
  
  // Test 3: Detect missing test_scenarios
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml'
    });
    console.log('✗ Test 3 failed: Should detect missing test_scenarios');
    failed++;
  } catch (error) {
    console.log('✓ Test 3 passed: Detect missing test_scenarios');
    passed++;
  }
  
  // Test 4: Detect empty test_scenarios
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: []
    });
    console.log('✗ Test 4 failed: Should detect empty test_scenarios');
    failed++;
  } catch (error) {
    console.log('✓ Test 4 passed: Detect empty test_scenarios');
    passed++;
  }
  
  // Test 5: Detect missing scenario name
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        { assertions: [{ type: 'state_reached', value: 'end' }] }
      ]
    });
    console.log('✗ Test 5 failed: Should detect missing scenario name');
    failed++;
  } catch (error) {
    console.log('✓ Test 5 passed: Detect missing scenario name');
    passed++;
  }
  
  // Test 6: Detect missing assertions
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        { name: 'Test' }
      ]
    });
    console.log('✗ Test 6 failed: Should detect missing assertions');
    failed++;
  } catch (error) {
    console.log('✓ Test 6 passed: Detect missing assertions');
    passed++;
  }
  
  // Test 7: Detect empty assertions
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        { name: 'Test', assertions: [] }
      ]
    });
    console.log('✗ Test 7 failed: Should detect empty assertions');
    failed++;
  } catch (error) {
    console.log('✓ Test 7 passed: Detect empty assertions');
    passed++;
  }
  
  // Test 8: Detect invalid assertion type
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        {
          name: 'Test',
          assertions: [{ type: 'invalid', target: 'var', value: 'test' }]
        }
      ]
    });
    console.log('✗ Test 8 failed: Should detect invalid assertion type');
    failed++;
  } catch (error) {
    console.log('✓ Test 8 passed: Detect invalid assertion type');
    passed++;
  }
  
  // Test 9: Accept valid state_reached assertion
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        {
          name: 'Test',
          assertions: [{ type: 'state_reached', value: 'end' }]
        }
      ]
    });
    console.log('✓ Test 9 passed: Accept valid state_reached assertion');
    passed++;
  } catch (error) {
    console.log('✗ Test 9 failed:', error.message);
    failed++;
  }
  
  // Test 10: Accept valid contains assertion
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        {
          name: 'Test',
          assertions: [{ type: 'contains', target: 'answer', value: 'test' }]
        }
      ]
    });
    console.log('✓ Test 10 passed: Accept valid contains assertion');
    passed++;
  } catch (error) {
    console.log('✗ Test 10 failed:', error.message);
    failed++;
  }
  
  // Test 11: Detect missing target in contains assertion
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        {
          name: 'Test',
          assertions: [{ type: 'contains', value: 'test' }]
        }
      ]
    });
    console.log('✗ Test 11 failed: Should detect missing target');
    failed++;
  } catch (error) {
    console.log('✓ Test 11 passed: Detect missing target in contains assertion');
    passed++;
  }
  
  // Test 12: Validate inputs array
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        {
          name: 'Test',
          inputs: [{ state: 'test_state', value: 'test_value' }],
          assertions: [{ type: 'state_reached', value: 'end' }]
        }
      ]
    });
    console.log('✓ Test 12 passed: Accept valid inputs array');
    passed++;
  } catch (error) {
    console.log('✗ Test 12 failed:', error.message);
    failed++;
  }
  
  // Test 13: Detect invalid regex pattern
  try {
    TestScenarioParser.validateTestSuite({
      workflow: 'test.yaml',
      test_scenarios: [
        {
          name: 'Test',
          assertions: [{ type: 'regex', target: 'var', value: '[invalid(' }]
        }
      ]
    });
    console.log('✗ Test 13 failed: Should detect invalid regex pattern');
    failed++;
  } catch (error) {
    console.log('✓ Test 13 passed: Detect invalid regex pattern');
    passed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = testTestScenarios;
