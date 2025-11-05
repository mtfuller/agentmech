const WorkflowParser = require('../dist/workflow-parser');
const Tracer = require('../dist/tracer');
const path = require('path');

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
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test the Tracer module
 * Validates tracing functionality and event logging
 * @returns {boolean} True if all tests pass, false otherwise
 */
function testTracer() {
  console.log('\n\nTesting Tracer...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Tracer disabled by default
  try {
    const tracer = new Tracer();
    if (!tracer.isEnabled()) {
      console.log('✓ Test 1 passed: Tracer disabled by default');
      passed++;
    } else {
      console.log('✗ Test 1 failed: Tracer should be disabled by default');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Test 2: Tracer can be enabled
  try {
    const tracer = new Tracer(true);
    if (tracer.isEnabled()) {
      console.log('✓ Test 2 passed: Tracer can be enabled');
      passed++;
    } else {
      console.log('✗ Test 2 failed: Tracer should be enabled');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message);
    failed++;
  }
  
  // Test 3: Tracer doesn't log when disabled
  try {
    const tracer = new Tracer(false);
    tracer.trace('test_event', { data: 'test' });
    if (tracer.getEvents().length === 0) {
      console.log("✓ Test 3 passed: Tracer doesn't log when disabled");
      passed++;
    } else {
      console.log('✗ Test 3 failed: Tracer logged events when disabled');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 3 failed:', error.message);
    failed++;
  }
  
  // Test 4: Tracer logs events when enabled
  try {
    const tracer = new Tracer(true);
    tracer.trace('test_event', { data: 'test' });
    const events = tracer.getEvents();
    if (events.length === 1 && events[0].type === 'test_event') {
      console.log('✓ Test 4 passed: Tracer logs events when enabled');
      passed++;
    } else {
      console.log('✗ Test 4 failed: Tracer didn\'t log events correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 4 failed:', error.message);
    failed++;
  }
  
  // Test 5: Tracer workflow start event
  try {
    const tracer = new Tracer(true);
    tracer.traceWorkflowStart('Test Workflow', 'start_state');
    const events = tracer.getEvents();
    if (events.length === 1 && 
        events[0].type === 'workflow_start' && 
        events[0].details.workflow === 'Test Workflow') {
      console.log('✓ Test 5 passed: Workflow start event logged');
      passed++;
    } else {
      console.log('✗ Test 5 failed: Workflow start event not logged correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 5 failed:', error.message);
    failed++;
  }
  
  // Test 6: Tracer state transition event
  try {
    const tracer = new Tracer(true);
    tracer.traceStateTransition('state1', 'state2', 'prompt');
    const events = tracer.getEvents();
    if (events.length === 1 && 
        events[0].type === 'state_transition' && 
        events[0].details.from === 'state1' &&
        events[0].details.to === 'state2') {
      console.log('✓ Test 6 passed: State transition event logged');
      passed++;
    } else {
      console.log('✗ Test 6 failed: State transition event not logged correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 6 failed:', error.message);
    failed++;
  }
  
  // Test 7: Tracer model interaction event
  try {
    const tracer = new Tracer(true);
    tracer.traceModelInteraction('llama2', 'Test prompt', 'Test response');
    const events = tracer.getEvents();
    if (events.length === 1 && 
        events[0].type === 'model_interaction' && 
        events[0].details.model === 'llama2') {
      console.log('✓ Test 7 passed: Model interaction event logged');
      passed++;
    } else {
      console.log('✗ Test 7 failed: Model interaction event not logged correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 7 failed:', error.message);
    failed++;
  }
  
  // Test 8: Tracer MCP server events
  try {
    const tracer = new Tracer(true);
    tracer.traceMcpServerRegister('test-server', 'node');
    tracer.traceMcpServerConnect('test-server', true);
    tracer.traceMcpServerDisconnect('test-server');
    const events = tracer.getEvents();
    if (events.length === 3 && 
        events[0].type === 'mcp_server_register' &&
        events[1].type === 'mcp_server_connect' &&
        events[2].type === 'mcp_server_disconnect') {
      console.log('✓ Test 8 passed: MCP server events logged');
      passed++;
    } else {
      console.log('✗ Test 8 failed: MCP server events not logged correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 8 failed:', error.message);
    failed++;
  }
  
  // Test 9: Tracer context update event
  try {
    const tracer = new Tracer(true);
    tracer.traceContextUpdate('test_var', 'test_value');
    const events = tracer.getEvents();
    if (events.length === 1 && 
        events[0].type === 'context_update' && 
        events[0].details.variable === 'test_var') {
      console.log('✓ Test 9 passed: Context update event logged');
      passed++;
    } else {
      console.log('✗ Test 9 failed: Context update event not logged correctly');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 9 failed:', error.message);
    failed++;
  }
  
  // Test 10: Tracer clear functionality
  try {
    const tracer = new Tracer(true);
    tracer.trace('test1', {});
    tracer.trace('test2', {});
    tracer.clear();
    if (tracer.getEvents().length === 0) {
      console.log('✓ Test 10 passed: Tracer clear functionality works');
      passed++;
    } else {
      console.log('✗ Test 10 failed: Tracer clear didn\'t remove events');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 10 failed:', error.message);
    failed++;
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
const tracerPassed = testTracer();
const ollamaPassed = testOllamaClient();

if (parserPassed && tracerPassed && ollamaPassed) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
