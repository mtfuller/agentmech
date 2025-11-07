/**
 * Tests for run directory management
 */

const RunDirectory = require('../../dist/utils/run-directory');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Run Directory Management', () => {
  let testBaseDir;
  
  beforeEach(() => {
    // Create a temporary directory for tests
    testBaseDir = path.join(os.tmpdir(), 'agentmech-test-runs-' + Date.now());
    fs.mkdirSync(testBaseDir, { recursive: true });
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });
  
  describe('generateRunDirectoryName', () => {
    it('should generate a valid directory name from workflow name', () => {
      const dirName = RunDirectory.generateRunDirectoryName('Test Workflow');
      
      expect(dirName).toMatch(/^test-workflow-\d{4}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}$/i);
    });
    
    it('should sanitize special characters from workflow name', () => {
      const dirName = RunDirectory.generateRunDirectoryName('My/Workflow:Test!@#$');
      
      expect(dirName).toMatch(/^my-workflow-test-\d{4}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}$/i);
      expect(dirName).not.toContain('/');
      expect(dirName).not.toContain(':');
      expect(dirName).not.toContain('!');
    });
    
    it('should convert workflow name to lowercase', () => {
      const dirName = RunDirectory.generateRunDirectoryName('UPPERCASE');
      
      expect(dirName).toMatch(/^uppercase-\d{4}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}$/i);
    });
  });
  
  describe('createRunDirectory', () => {
    it('should create a unique run directory', () => {
      const runDirInfo = RunDirectory.createRunDirectory('Test Workflow', testBaseDir);
      
      expect(runDirInfo).toBeDefined();
      expect(runDirInfo.path).toBeDefined();
      expect(runDirInfo.workflowName).toBe('Test Workflow');
      expect(runDirInfo.timestamp).toBeDefined();
      
      // Verify directory was created
      expect(fs.existsSync(runDirInfo.path)).toBe(true);
      expect(fs.statSync(runDirInfo.path).isDirectory()).toBe(true);
    });
    
    it('should create directory in default location if no base dir provided', () => {
      const runDirInfo = RunDirectory.createRunDirectory('Test Workflow');
      
      const expectedBasePath = path.join(os.homedir(), '.agentmech', 'runs');
      expect(runDirInfo.path).toContain(expectedBasePath);
      
      // Clean up
      if (fs.existsSync(runDirInfo.path)) {
        fs.rmSync(runDirInfo.path, { recursive: true, force: true });
      }
    });
    
    it('should create nested directories if they do not exist', () => {
      const nestedBase = path.join(testBaseDir, 'nested', 'path');
      const runDirInfo = RunDirectory.createRunDirectory('Test Workflow', nestedBase);
      
      expect(fs.existsSync(runDirInfo.path)).toBe(true);
    });
  });
  
  describe('getTraceLogPath', () => {
    it('should return correct trace log path', () => {
      const runDir = '/test/run/dir';
      const tracePath = RunDirectory.getTraceLogPath(runDir);
      
      expect(tracePath).toBe(path.join(runDir, 'trace.log'));
    });
  });
  
  describe('writeRunMetadata', () => {
    it('should write metadata file to run directory', () => {
      const runDirInfo = RunDirectory.createRunDirectory('Test Workflow', testBaseDir);
      RunDirectory.writeRunMetadata(runDirInfo);
      
      const metadataPath = path.join(runDirInfo.path, 'run-metadata.json');
      expect(fs.existsSync(metadataPath)).toBe(true);
      
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      expect(metadata.workflowName).toBe('Test Workflow');
      expect(metadata.timestamp).toBe(runDirInfo.timestamp);
      expect(metadata.runDirectory).toBe(runDirInfo.path);
    });
    
    it('should not throw if directory does not exist (non-critical)', () => {
      const invalidRunDirInfo = {
        path: '/non/existent/path',
        workflowName: 'Test',
        timestamp: new Date().toISOString()
      };
      
      // Should not throw, just log warning
      expect(() => RunDirectory.writeRunMetadata(invalidRunDirInfo)).not.toThrow();
    });
  });
});
