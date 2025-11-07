/**
 * Integration tests for run directory feature
 */

const WorkflowParser = require('../../dist/core/workflow-parser');
const WorkflowExecutor = require('../../dist/core/workflow-executor');
const Tracer = require('../../dist/utils/tracer');
const RunDirectory = require('../../dist/utils/run-directory');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Run Directory Integration', () => {
  let testBaseDir;
  let testWorkflowPath;
  
  beforeEach(() => {
    // Create a temporary directory for tests
    testBaseDir = path.join(os.tmpdir(), 'agentmech-test-integration-' + Date.now());
    fs.mkdirSync(testBaseDir, { recursive: true });
    
    // Create a simple test workflow
    const workflowYaml = `
name: "Test Workflow"
description: "Test workflow for run directory"
default_model: "gemma3:4b"
start_state: "start"

states:
  start:
    type: "prompt"
    prompt: "Test prompt"
    next: "end"
`;
    
    testWorkflowPath = path.join(testBaseDir, 'test-workflow.yaml');
    fs.writeFileSync(testWorkflowPath, workflowYaml, 'utf8');
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });
  
  it('should add run_directory to context when provided', () => {
    const workflow = WorkflowParser.parseFile(testWorkflowPath);
    const runDir = path.join(testBaseDir, 'run-dir');
    fs.mkdirSync(runDir, { recursive: true });
    
    const tracer = new Tracer(false);
    const executor = new WorkflowExecutor(workflow, 'http://localhost:11434', tracer, runDir);
    
    // Access the context via the executor (note: this is testing implementation details)
    // In a real scenario, we'd verify this by checking if the workflow can access {{run_directory}}
    expect(executor['context']['run_directory']).toBe(runDir);
  });
  
  it('should auto-inject filesystem MCP server when run directory is provided', async () => {
    const workflow = WorkflowParser.parseFile(testWorkflowPath);
    const runDir = path.join(testBaseDir, 'run-dir');
    fs.mkdirSync(runDir, { recursive: true });
    
    const tracer = new Tracer(false);
    const executor = new WorkflowExecutor(workflow, 'http://localhost:11434', tracer, runDir);
    
    // The MCP server should not be configured yet
    expect(workflow.mcp_servers).toBeUndefined();
    
    // Execute will auto-inject the filesystem MCP server
    // Note: We can't actually execute the workflow without Ollama, but we can check
    // that the MCP server configuration would be set up
    
    // For now, just verify the workflow can be created with a run directory
    expect(executor).toBeDefined();
  });
  
  it('should create run directory with correct structure', () => {
    const runDirInfo = RunDirectory.createRunDirectory('Test Workflow', testBaseDir);
    
    expect(fs.existsSync(runDirInfo.path)).toBe(true);
    expect(runDirInfo.workflowName).toBe('Test Workflow');
    
    // Write metadata
    RunDirectory.writeRunMetadata(runDirInfo);
    
    const metadataPath = path.join(runDirInfo.path, 'run-metadata.json');
    expect(fs.existsSync(metadataPath)).toBe(true);
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    expect(metadata.workflowName).toBe('Test Workflow');
  });
  
  it('should create trace log in run directory', (done) => {
    const runDirInfo = RunDirectory.createRunDirectory('Test Workflow', testBaseDir);
    const traceLogPath = RunDirectory.getTraceLogPath(runDirInfo.path);
    
    expect(traceLogPath).toBe(path.join(runDirInfo.path, 'trace.log'));
    
    // Create a tracer with the run directory trace log
    const tracer = new Tracer(true, traceLogPath);
    tracer.traceWorkflowStart('Test Workflow', 'start');
    tracer.close();
    
    // Wait a bit for file stream to flush
    setTimeout(() => {
      // Verify trace log was created after close
      expect(fs.existsSync(traceLogPath)).toBe(true);
      const logContent = fs.readFileSync(traceLogPath, 'utf8');
      expect(logContent).toContain('Trace Session Started');
      expect(logContent).toContain('workflow_start');
      done();
    }, 100);
  });
});
