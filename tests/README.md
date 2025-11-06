# AI Workflow CLI - Test Suite

This directory contains the test suite for the AI Workflow CLI, organized by feature for better maintainability and clarity.

## Test Organization

The tests are organized into three main categories:

### 1. Workflow Parser Tests (`workflow-parser/`)
Tests for workflow parsing, validation, and structure:

- **`basic-validation.test.js`** - Core workflow parsing and state validation
  - Valid workflow parsing
  - Workflow structure validation
  - Missing start_state detection
  - Invalid state type detection
  - Missing prompt detection
  - Transition state validation

- **`external-files.test.js`** - External file handling
  - External prompt file loading
  - Workflow reference importing
  - Missing file detection
  - Circular reference detection
  - Conflicting prompt configuration detection

- **`mcp-configuration.test.js`** - Model Context Protocol (MCP) server configuration
  - MCP server configuration validation
  - Missing command detection
  - Invalid server reference detection
  - Valid server reference validation

- **`input-states.test.js`** - Input state validation
  - Valid input state configuration
  - Missing prompt detection
  - Default value support

### 2. RAG Tests (`rag/`)
Tests for Retrieval-Augmented Generation functionality:

- **`configuration.test.js`** - RAG configuration validation
  - RAG configuration parsing
  - Directory requirement validation
  - use_rag validation
  - Inline RAG configuration
  - Named RAG configurations
  - Conflicting configuration detection

- **`storage.test.js`** - RAG storage format tests
  - MessagePack format creation and loading
  - JSON format backward compatibility
  - File size comparison
  - JSON to MessagePack migration

### 3. Feature Tests (`features/`)
Tests for specific workflow features:

- **`next-options.test.js`** - LLM-driven state selection
  - Valid next_options configuration
  - Minimum options requirement
  - State and description field validation
  - State reference validation
  - Conflicting configuration detection
  - Empty field detection

- **`fallback-flow.test.js`** - Error handling and fallback flows
  - State-level fallback configuration
  - Workflow-level fallback configuration
  - Invalid reference detection
  - Mixed fallback configurations

- **`ollama-client.test.js`** - Ollama integration
  - Skipped tests (requires running Ollama instance)

## Running Tests

### Run All Tests
```bash
npm test
```

This runs the complete test suite with all feature-organized tests.

### Run RAG Storage Tests Only
```bash
npm run test:rag-storage
```

This runs the RAG storage format tests separately. These tests are async and may take longer to complete.

## Test Structure

Each test file exports a function that:
- Returns `true` if all tests pass
- Returns `false` if any test fails
- Prints detailed test results to the console

The main test runner (`test-runner.js`) coordinates all tests and provides a comprehensive summary.

## Test Output

Tests provide clear, formatted output with:
- ✓ for passed tests
- ✗ for failed tests
- ℹ for informational messages
- Clear section separators for different test categories

## Adding New Tests

To add new tests:

1. Create a new test file in the appropriate category directory
2. Export a test function that returns a boolean
3. Add the test to `test-runner.js`
4. Run `npm test` to verify

Example test structure:
```javascript
function testMyFeature() {
  console.log('Testing My Feature...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Description
  try {
    // Test logic
    console.log('✓ Test 1 passed: Description');
    passed++;
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = testMyFeature;
```

## Migration from Old Structure

The tests were previously organized as:
- `run-tests.js` - All workflow parser, RAG, and feature tests combined
- `test-rag-storage.js` - RAG storage tests

They are now organized by feature for better clarity and maintainability.
