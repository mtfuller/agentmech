const WorkflowTester = require('../dist/workflow-tester');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Test the WorkflowTester module
 * Validates test scenario parsing, execution, and assertion evaluation
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testWorkflowTester() {
  console.log('Testing WorkflowTester...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Load and validate test suite
  try {
    const tester = new WorkflowTester(path.join(__dirname, '../examples/simple-qa.test.yaml'));
    console.log('✓ Test 1 passed: Load and validate test suite');
    passed++;
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Detect missing workflow field
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-missing-workflow.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      scenarios: [
        {
          name: 'Test',
          assertions: [
            { type: 'contains', target: 'output', value: 'test' }
          ]
        }
      ]
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✗ Test 2 failed: Should detect missing workflow field');
      failed++;
    } catch (error) {
      if (error.message.includes('workflow')) {
        console.log('✓ Test 2 passed: Detect missing workflow field');
        passed++;
      } else {
        console.log('✗ Test 2 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Detect empty scenarios array
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-empty-scenarios.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: 'simple-qa.yaml',
      scenarios: []
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✗ Test 3 failed: Should detect empty scenarios array');
      failed++;
    } catch (error) {
      if (error.message.includes('at least one scenario')) {
        console.log('✓ Test 3 passed: Detect empty scenarios array');
        passed++;
      } else {
        console.log('✗ Test 3 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 3 failed:', error.message);
    failed++;
  }
  
  // Test 4: Detect scenario without name
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-no-name.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: 'simple-qa.yaml',
      scenarios: [
        {
          assertions: [
            { type: 'contains', target: 'output', value: 'test' }
          ]
        }
      ]
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✗ Test 4 failed: Should detect scenario without name');
      failed++;
    } catch (error) {
      if (error.message.includes('name')) {
        console.log('✓ Test 4 passed: Detect scenario without name');
        passed++;
      } else {
        console.log('✗ Test 4 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 4 failed:', error.message);
    failed++;
  }
  
  // Test 5: Detect scenario without assertions
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-no-assertions.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: 'simple-qa.yaml',
      scenarios: [
        {
          name: 'Test Scenario',
          assertions: []
        }
      ]
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✗ Test 5 failed: Should detect scenario without assertions');
      failed++;
    } catch (error) {
      if (error.message.includes('at least one assertion')) {
        console.log('✓ Test 5 passed: Detect scenario without assertions');
        passed++;
      } else {
        console.log('✗ Test 5 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 5 failed:', error.message);
    failed++;
  }
  
  // Test 6: Detect invalid assertion type
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-invalid-assertion.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: 'simple-qa.yaml',
      scenarios: [
        {
          name: 'Test Scenario',
          assertions: [
            { type: 'invalid_type', target: 'output', value: 'test' }
          ]
        }
      ]
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✗ Test 6 failed: Should detect invalid assertion type');
      failed++;
    } catch (error) {
      if (error.message.includes('invalid type')) {
        console.log('✓ Test 6 passed: Detect invalid assertion type');
        passed++;
      } else {
        console.log('✗ Test 6 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 6 failed:', error.message);
    failed++;
  }
  
  // Test 7: Detect missing pattern in regex assertion
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-missing-pattern.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: 'simple-qa.yaml',
      scenarios: [
        {
          name: 'Test Scenario',
          assertions: [
            { type: 'regex', target: 'output' }
          ]
        }
      ]
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✗ Test 7 failed: Should detect missing pattern in regex assertion');
      failed++;
    } catch (error) {
      if (error.message.includes('pattern')) {
        console.log('✓ Test 7 passed: Detect missing pattern in regex assertion');
        passed++;
      } else {
        console.log('✗ Test 7 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 7 failed:', error.message);
    failed++;
  }
  
  // Test 8: Accept valid test suite
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-valid.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: '../examples/simple-qa.yaml',
      scenarios: [
        {
          name: 'Valid Test',
          description: 'A valid test scenario',
          mocks: [
            { state: 'ask_question', response: 'Test response' }
          ],
          assertions: [
            { type: 'contains', target: 'output', value: 'test' },
            { type: 'equals', target: 'answer', value: 'Test response' },
            { type: 'regex', target: 'output', pattern: 'test' },
            { type: 'variable_set', target: 'answer' }
          ]
        }
      ]
    }));
    
    try {
      new WorkflowTester(tmpTestFile);
      console.log('✓ Test 8 passed: Accept valid test suite');
      passed++;
    } catch (error) {
      console.log('✗ Test 8 failed:', error.message);
      failed++;
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 8 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test workflow test execution
 * @returns {boolean} True if all tests pass, false otherwise
 */
async function testWorkflowExecution() {
  console.log('\n\nTesting Workflow Test Execution...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Run simple-qa test suite
  try {
    const tester = new WorkflowTester(path.join(__dirname, '../examples/simple-qa.test.yaml'));
    const result = await tester.runTests();
    
    if (result.totalPassed === 2 && result.totalFailed === 0) {
      console.log('✓ Test 1 passed: Run simple-qa test suite');
      passed++;
    } else {
      console.log(`✗ Test 1 failed: Expected 2 passed, 0 failed, got ${result.totalPassed} passed, ${result.totalFailed} failed`);
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Run story-generator test suite
  try {
    const tester = new WorkflowTester(path.join(__dirname, '../examples/story-generator.test.yaml'));
    const result = await tester.runTests();
    
    if (result.totalPassed === 2 && result.totalFailed === 0) {
      console.log('✓ Test 2 passed: Run story-generator test suite');
      passed++;
    } else {
      console.log(`✗ Test 2 failed: Expected 2 passed, 0 failed, got ${result.totalPassed} passed, ${result.totalFailed} failed`);
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Run user-input-demo test suite
  try {
    const tester = new WorkflowTester(path.join(__dirname, '../examples/user-input-demo.test.yaml'));
    const result = await tester.runTests();
    
    if (result.totalPassed === 2 && result.totalFailed === 0) {
      console.log('✓ Test 3 passed: Run user-input-demo test suite');
      passed++;
    } else {
      console.log(`✗ Test 3 failed: Expected 2 passed, 0 failed, got ${result.totalPassed} passed, ${result.totalFailed} failed`);
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 3 failed:', error.message);
    failed++;
  }
  
  // Test 4: Generate test report
  try {
    const tester = new WorkflowTester(path.join(__dirname, '../examples/simple-qa.test.yaml'));
    const result = await tester.runTests();
    const report = tester.generateReport(result);
    
    if (report.includes('TEST REPORT') && 
        report.includes('simple-qa.yaml') &&
        report.includes('✓ ALL TESTS PASSED')) {
      console.log('✓ Test 4 passed: Generate test report');
      passed++;
    } else {
      console.log('✗ Test 4 failed: Report does not contain expected content');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 4 failed:', error.message);
    failed++;
  }
  
  // Test 5: Test failed assertion
  try {
    const tmpTestFile = path.join(__dirname, '../tmp-test-fail.yaml');
    fs.writeFileSync(tmpTestFile, yaml.dump({
      workflow: '../examples/simple-qa.yaml',
      scenarios: [
        {
          name: 'Failing Test',
          mocks: [
            { state: 'ask_question', response: 'Test response' }
          ],
          assertions: [
            { type: 'contains', target: 'output', value: 'this should not exist' }
          ]
        }
      ]
    }));
    
    try {
      const tester = new WorkflowTester(tmpTestFile);
      const result = await tester.runTests();
      
      if (result.totalPassed === 0 && result.totalFailed === 1) {
        console.log('✓ Test 5 passed: Test failed assertion');
        passed++;
      } else {
        console.log(`✗ Test 5 failed: Expected 0 passed, 1 failed, got ${result.totalPassed} passed, ${result.totalFailed} failed`);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpTestFile);
    }
  } catch (error) {
    console.log('✗ Test 5 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests
async function runAllTests() {
  console.log('=== Running Workflow Tester Tests ===\n');
  const validationPassed = testWorkflowTester();
  const executionPassed = await testWorkflowExecution();
  
  if (validationPassed && executionPassed) {
    console.log('\n✓ All workflow tester tests passed!');
    return true;
  } else {
    console.log('\n✗ Some workflow tester tests failed');
    return false;
  }
}

module.exports = { runAllTests };

// Run if executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
