const WorkflowParser = require('../../dist/workflow-parser');

function testMcpConfiguration() {
  console.log('Testing MCP Server Configuration...\n');
  
  let passed = 0;
  let failed = 0;
  
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
    console.log('✓ Test 1 passed: Validate MCP server configuration');
    passed++;
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
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
    console.log('✗ Test 2 failed: Should detect missing MCP server command');
    failed++;
  } catch (error) {
    console.log('✓ Test 2 passed: Detect missing MCP server command');
    passed++;
  }
  
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
    console.log('✗ Test 3 failed: Should detect invalid MCP server reference');
    failed++;
  } catch (error) {
    console.log('✓ Test 3 passed: Detect invalid MCP server reference');
    passed++;
  }
  
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
    console.log('✓ Test 4 passed: Accept valid MCP server reference');
    passed++;
  } catch (error) {
    console.log('✗ Test 4 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = testMcpConfiguration;
