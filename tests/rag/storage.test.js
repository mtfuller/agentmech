const RagService = require('../../dist/integrations/rag-service');
const fs = require('fs');
const path = require('path');

describe('RAG Storage Formats', () => {
  const testDir = path.join(__dirname, '../../tmp-rag-test');
  const testDocPath = path.join(testDir, 'test-doc.txt');

  beforeAll(() => {
    // Create a temporary test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // Create a test document
    fs.writeFileSync(testDocPath, 'This is a test document for RAG functionality. It contains information about testing.');
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should create and save embeddings in MessagePack format', async () => {
    const ragServiceMsgpack = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddings_file: 'test-embeddings.msgpack',
      storage_format: 'msgpack',
      chunk_size: 100,
      top_k: 2
    });

    await ragServiceMsgpack.initialize();
    const msgpackPath = path.join(testDir, 'test-embeddings.msgpack');
    expect(fs.existsSync(msgpackPath)).toBe(true);
    const stats = fs.statSync(msgpackPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should create and save embeddings in JSON format', async () => {
    const ragServiceJson = new RagService({
      directory: testDir,
      model: 'gemma3:4b',
      embeddings_file: 'test-embeddings.json',
      storage_format: 'json',
      chunk_size: 100,
      top_k: 2
    });

    await ragServiceJson.initialize();
    const jsonPath = path.join(testDir, 'test-embeddings.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const stats = fs.statSync(jsonPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should have MessagePack file smaller than JSON', () => {
    const msgpackPath = path.join(testDir, 'test-embeddings.msgpack');
    const jsonPath = path.join(testDir, 'test-embeddings.json');

    expect(fs.existsSync(msgpackPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

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

