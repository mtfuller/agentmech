const RagService = require('../../dist/rag-service');
const fs = require('fs');
const path = require('path');

describe('RAG Storage Formats', () => {
  let testDir;
  let testDocPath;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = path.join(__dirname, '../../tmp-rag-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create a test document
    testDocPath = path.join(testDir, 'test-doc.txt');
    fs.writeFileSync(testDocPath, 'This is a test document for RAG functionality. It contains information about testing.');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should create and save embeddings in MessagePack format', async () => {
    const ragServiceMsgpack = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.msgpack',
      storageFormat: 'msgpack',
      chunkSize: 100,
      topK: 2
    });

    await ragServiceMsgpack.initialize();
    
    const msgpackPath = path.join(testDir, 'test-embeddings.msgpack');
    expect(fs.existsSync(msgpackPath)).toBe(true);
    const stats = fs.statSync(msgpackPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should load embeddings from MessagePack format', async () => {
    // First create embeddings
    const ragServiceCreate = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.msgpack',
      storageFormat: 'msgpack',
      chunkSize: 100,
      topK: 2
    });
    await ragServiceCreate.initialize();

    // Then load them
    const ragServiceLoad = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.msgpack',
      storageFormat: 'msgpack',
      chunkSize: 100,
      topK: 2
    });

    await expect(ragServiceLoad.initialize()).resolves.not.toThrow();
  });

  test('should create and save embeddings in JSON format', async () => {
    const ragServiceJson = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.json',
      storageFormat: 'json',
      chunkSize: 100,
      topK: 2
    });

    await ragServiceJson.initialize();
    
    const jsonPath = path.join(testDir, 'test-embeddings.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const stats = fs.statSync(jsonPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should have MessagePack files smaller than JSON files', async () => {
    // Create MessagePack file
    const ragServiceMsgpack = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.msgpack',
      storageFormat: 'msgpack',
      chunkSize: 100,
      topK: 2
    });
    await ragServiceMsgpack.initialize();

    // Create JSON file
    const ragServiceJson = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddingsFile: 'test-embeddings.json',
      storageFormat: 'json',
      chunkSize: 100,
      topK: 2
    });
    await ragServiceJson.initialize();

    const msgpackPath = path.join(testDir, 'test-embeddings.msgpack');
    const jsonPath = path.join(testDir, 'test-embeddings.json');

    const msgpackSize = fs.statSync(msgpackPath).size;
    const jsonSize = fs.statSync(jsonPath).size;

    expect(msgpackSize).toBeLessThan(jsonSize);
  });

  test('should migrate from JSON to MessagePack', async () => {
    // Create a new directory for migration test
    const migrationDir = path.join(testDir, 'migration-test');
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }

    // First create JSON embeddings
    const jsonService = new RagService({
      directory: migrationDir,
      model: 'gemma3:4b',
      embeddingsFile: 'embeddings.json',
      storageFormat: 'json',
      chunkSize: 100,
      topK: 2
    });

    // Copy test document
    const migrationDocPath = path.join(migrationDir, 'test-doc.txt');
    fs.copyFileSync(testDocPath, migrationDocPath);

    await jsonService.initialize();

    // Now initialize with msgpack format - should detect and migrate JSON
    const ragServiceMigration = new RagService({
      directory: migrationDir,
      model: 'gemma3:4b',
      embeddingsFile: 'embeddings.msgpack',
      storageFormat: 'msgpack',
      chunkSize: 100,
      topK: 2
    });

    await ragServiceMigration.initialize();

    const msgpackPath = path.join(migrationDir, 'embeddings.msgpack');
    expect(fs.existsSync(msgpackPath)).toBe(true);
  });
});
