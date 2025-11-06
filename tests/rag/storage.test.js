const RagService = require('../dist/rag-service');
const fs = require('fs');
const path = require('path');

/**
 * Test RAG storage format functionality
 * Validates MessagePack format, JSON backward compatibility, and migration
 */
function testRagStorage() {
  console.log('Testing RAG Storage Formats...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Create a temporary test directory
  const testDir = path.join(__dirname, '../tmp-rag-test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create a test document
  const testDocPath = path.join(testDir, 'test-doc.txt');
  fs.writeFileSync(testDocPath, 'This is a test document for RAG functionality. It contains information about testing.');
  
  // Test 1: Create and save embeddings in MessagePack format
  console.log('Test 1: Create and save embeddings in MessagePack format');
  try {
    const ragServiceMsgpack = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.msgpack',
      storageFormat: 'msgpack',
      chunkSize: 100,
      topK: 2
    });
    
    // This will create embeddings (but fallback will be used since Ollama isn't running)
    ragServiceMsgpack.initialize().then(() => {
      const msgpackPath = path.join(testDir, 'test-embeddings.msgpack');
      if (fs.existsSync(msgpackPath)) {
        const stats = fs.statSync(msgpackPath);
        console.log(`✓ Test 1 passed: MessagePack file created (${stats.size} bytes)`);
        passed++;
        runTest2();
      } else {
        console.log('✗ Test 1 failed: MessagePack file not created');
        failed++;
        cleanup();
      }
    }).catch(error => {
      console.log('✗ Test 1 failed:', error.message);
      failed++;
      cleanup();
    });
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
    cleanup();
  }
  
  function runTest2() {
    // Test 2: Load embeddings from MessagePack format
    console.log('\nTest 2: Load embeddings from MessagePack format');
    try {
      const ragServiceLoad = new RagService({
        directory: testDir,
        model: 'gemma3:4b',
        embeddingsFile: 'test-embeddings.msgpack',
        storageFormat: 'msgpack',
        chunkSize: 100,
        topK: 2
      });
      
      ragServiceLoad.initialize().then(() => {
        console.log('✓ Test 2 passed: MessagePack embeddings loaded successfully');
        passed++;
        runTest3();
      }).catch(error => {
        console.log('✗ Test 2 failed:', error.message);
        failed++;
        cleanup();
      });
    } catch (error) {
      console.log('✗ Test 2 failed:', error.message);
      failed++;
      cleanup();
    }
  }
  
  function runTest3() {
    // Test 3: Create embeddings in JSON format (backward compatibility)
    console.log('\nTest 3: Create and save embeddings in JSON format');
    try {
      const ragServiceJson = new RagService({
        directory: testDir,
        model: 'gemma3:4b',
        embeddingsFile: 'test-embeddings.json',
        storageFormat: 'json',
        chunkSize: 100,
        topK: 2
      });
      
      ragServiceJson.initialize().then(() => {
        const jsonPath = path.join(testDir, 'test-embeddings.json');
        if (fs.existsSync(jsonPath)) {
          const stats = fs.statSync(jsonPath);
          console.log(`✓ Test 3 passed: JSON file created (${stats.size} bytes)`);
          passed++;
          runTest4();
        } else {
          console.log('✗ Test 3 failed: JSON file not created');
          failed++;
          cleanup();
        }
      }).catch(error => {
        console.log('✗ Test 3 failed:', error.message);
        failed++;
        cleanup();
      });
    } catch (error) {
      console.log('✗ Test 3 failed:', error.message);
      failed++;
      cleanup();
    }
  }
  
  function runTest4() {
    // Test 4: Compare file sizes (MessagePack should be smaller)
    console.log('\nTest 4: Compare file sizes');
    try {
      const msgpackPath = path.join(testDir, 'test-embeddings.msgpack');
      const jsonPath = path.join(testDir, 'test-embeddings.json');
      
      if (fs.existsSync(msgpackPath) && fs.existsSync(jsonPath)) {
        const msgpackSize = fs.statSync(msgpackPath).size;
        const jsonSize = fs.statSync(jsonPath).size;
        const reduction = ((jsonSize - msgpackSize) / jsonSize * 100).toFixed(1);
        
        if (msgpackSize < jsonSize) {
          console.log(`✓ Test 4 passed: MessagePack is ${reduction}% smaller (${msgpackSize} vs ${jsonSize} bytes)`);
          passed++;
        } else {
          console.log(`✗ Test 4 failed: MessagePack is not smaller (${msgpackSize} vs ${jsonSize} bytes)`);
          failed++;
        }
      } else {
        console.log('✗ Test 4 failed: Missing comparison files');
        failed++;
      }
      runTest5();
    } catch (error) {
      console.log('✗ Test 4 failed:', error.message);
      failed++;
      cleanup();
    }
  }
  
  function runTest5() {
    // Test 5: Test migration from JSON to MessagePack
    console.log('\nTest 5: Test migration from JSON to MessagePack');
    try {
      // Create a new directory for migration test
      const migrationDir = path.join(testDir, 'migration-test');
      if (!fs.existsSync(migrationDir)) {
        fs.mkdirSync(migrationDir, { recursive: true });
      }
      
      // Copy the JSON embeddings as legacy file
      const jsonPath = path.join(testDir, 'test-embeddings.json');
      const legacyJsonPath = path.join(migrationDir, 'embeddings.json');
      fs.copyFileSync(jsonPath, legacyJsonPath);
      
      // Copy test document
      const migrationDocPath = path.join(migrationDir, 'test-doc.txt');
      fs.copyFileSync(testDocPath, migrationDocPath);
      
      // Initialize with msgpack format - should detect and migrate JSON
      const ragServiceMigration = new RagService({
        directory: migrationDir,
        model: 'gemma3:4b',
        embeddingsFile: 'embeddings.msgpack', // Default msgpack name
        storageFormat: 'msgpack',
        chunkSize: 100,
        topK: 2
      });
      
      ragServiceMigration.initialize().then(() => {
        const msgpackPath = path.join(migrationDir, 'embeddings.msgpack');
        if (fs.existsSync(msgpackPath)) {
          console.log('✓ Test 5 passed: JSON successfully migrated to MessagePack');
          passed++;
        } else {
          console.log('✗ Test 5 failed: Migration did not create MessagePack file');
          failed++;
        }
        cleanup();
      }).catch(error => {
        console.log('✗ Test 5 failed:', error.message);
        failed++;
        cleanup();
      });
    } catch (error) {
      console.log('✗ Test 5 failed:', error.message);
      failed++;
      cleanup();
    }
  }
  
  function cleanup() {
    // Clean up test directory
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      console.log(`\n\nResults: ${passed} passed, ${failed} failed`);
      process.exit(failed === 0 ? 0 : 1);
    } catch (error) {
      console.error('Error during cleanup:', error.message);
      process.exit(1);
    }
  }
}

<<<<<<< HEAD
// Run tests
console.log('=== Running RAG Storage Format Tests ===\n');
testRagStorage();
=======
module.exports = testRagStorage;

// Run tests if this file is executed directly
// This test is async and has special cleanup requirements, so it's designed
// to be run standalone via: npm run test:rag-storage
if (require.main === module) {
  console.log('=== Running RAG Storage Format Tests ===\n');
  testRagStorage();
}
>>>>>>> 6f4e8dc (Add clarifying comment to RAG storage test)
