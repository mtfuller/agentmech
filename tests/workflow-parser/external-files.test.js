const WorkflowParser = require('../../dist/workflow-parser');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Test external file handling (prompt files and workflow references)
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testExternalFiles() {
  console.log('Testing External File Handling...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Parse workflow with external prompt file
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/external-prompt-file.yaml'));
    if (workflow.states.generate_story.prompt && workflow.states.generate_story.prompt.includes('time traveler')) {
      console.log('✓ Test 1 passed: Parse workflow with external prompt file');
      passed++;
    } else {
      console.log('✗ Test 1 failed: External prompt file not loaded correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Parse workflow with workflow reference
  try {
    const workflow = WorkflowParser.parseFile(path.join(__dirname, '../../examples/workflow-reference.yaml'));
    // Should have imported states from greeting-workflow.yaml
    // The referenced workflow should have its states prefixed
    if (workflow.states['start_greeting_ref_greet'] && workflow.states['start_greeting_ref_greet'].type === 'prompt') {
      console.log('✓ Test 2 passed: Parse workflow with workflow reference');
      passed++;
    } else {
      console.log('✗ Test 2 failed: Workflow reference not imported correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Detect missing external prompt file
  try {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-missing-prompt.yaml');
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
      console.log('✗ Test 3 failed: Should detect missing external prompt file');
      failed++;
    } catch (error) {
      if (error.message.includes('Prompt file not found')) {
        console.log('✓ Test 3 passed: Detect missing external prompt file');
        passed++;
      } else {
        console.log('✗ Test 3 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  } catch (error) {
    console.log('✗ Test 3 failed:', error.message);
    failed++;
  }
  
  // Test 4: Detect circular workflow references
  try {
    const tmpWorkflowA = path.join(__dirname, '../../examples/tmp-test-circular-a.yaml');
    const tmpWorkflowB = path.join(__dirname, '../../examples/tmp-test-circular-b.yaml');
    
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
      console.log('✗ Test 4 failed: Should detect circular workflow references');
      failed++;
    } catch (error) {
      if (error.message.includes('Circular workflow reference')) {
        console.log('✓ Test 4 passed: Detect circular workflow references');
        passed++;
      } else {
        console.log('✗ Test 4 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpWorkflowA);
      fs.unlinkSync(tmpWorkflowB);
    }
  } catch (error) {
    console.log('✗ Test 4 failed:', error.message);
    failed++;
  }
  
  // Test 5: Detect conflicting prompt and prompt_file
  try {
    const tmpWorkflow = path.join(__dirname, '../../examples/tmp-test-conflicting-prompt.yaml');
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
      console.log('✗ Test 5 failed: Should detect conflicting prompt and prompt_file');
      failed++;
    } catch (error) {
      if (error.message.includes('both prompt and prompt_file')) {
        console.log('✓ Test 5 passed: Detect conflicting prompt and prompt_file');
        passed++;
      } else {
        console.log('✗ Test 5 failed: Wrong error message:', error.message);
        failed++;
      }
    } finally {
      fs.unlinkSync(tmpWorkflow);
    }
  } catch (error) {
    console.log('✗ Test 5 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = testExternalFiles;
