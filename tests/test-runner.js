/**
 * Unified test runner for ai-workflow-cli
 * Executes all test suites organized by feature
 */

// Workflow Parser Tests
const testBasicValidation = require('./workflow-parser/basic-validation.test');
const testExternalFiles = require('./workflow-parser/external-files.test');
const testMcpConfiguration = require('./workflow-parser/mcp-configuration.test');
const testInputStates = require('./workflow-parser/input-states.test');

// RAG Tests
const testRagConfiguration = require('./rag/configuration.test');

// Feature Tests
const testNextOptions = require('./features/next-options.test');
const testFallbackFlow = require('./features/fallback-flow.test');
const testOllamaClient = require('./features/ollama-client.test');
const testTestScenarios = require('./features/test-scenarios.test');

console.log('=== AI Workflow CLI Test Suite ===\n');
console.log('Running tests organized by feature...\n');

let allTestsPassed = true;

// Run Workflow Parser Tests
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('WORKFLOW PARSER TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

allTestsPassed = testBasicValidation() && allTestsPassed;
console.log();
allTestsPassed = testExternalFiles() && allTestsPassed;
console.log();
allTestsPassed = testMcpConfiguration() && allTestsPassed;
console.log();
allTestsPassed = testInputStates() && allTestsPassed;

// Run RAG Tests
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RAG (RETRIEVAL-AUGMENTED GENERATION) TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

allTestsPassed = testRagConfiguration() && allTestsPassed;

// Run Feature Tests
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('FEATURE TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

allTestsPassed = testNextOptions() && allTestsPassed;
console.log();
allTestsPassed = testFallbackFlow() && allTestsPassed;
console.log();
allTestsPassed = testOllamaClient() && allTestsPassed;
console.log();
allTestsPassed = testTestScenarios() && allTestsPassed;

// Print final summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (allTestsPassed) {
  console.log('✓ All tests passed!\n');
  process.exit(0);
} else {
  console.log('✗ Some tests failed\n');
  process.exit(1);
}
