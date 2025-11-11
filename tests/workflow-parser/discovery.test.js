const WorkflowDiscovery = require('../../dist/workflow/discovery');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Workflow Discovery', () => {
  let testDir;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-discovery-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should discover valid workflow files', () => {
    // Create a valid workflow file
    const workflowContent = `
name: "Test Workflow"
description: "A test workflow"
start_state: "start"
states:
  start:
    type: "prompt"
    prompt: "Hello"
    next: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow.yaml'), workflowContent);

    const workflows = WorkflowDiscovery.discoverWorkflows(testDir);
    expect(workflows).toHaveLength(1);
    expect(workflows[0].name).toBe('Test Workflow');
    expect(workflows[0].fileName).toBe('workflow.yaml');
    expect(workflows[0].valid).toBe(true);
  });

  test('should exclude .test.yaml files', () => {
    // Create a workflow file
    const workflowContent = `
name: "Test Workflow"
start_state: "start"
states:
  start:
    type: "prompt"
    prompt: "Hello"
    next: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow.yaml'), workflowContent);

    // Create a test scenario file
    const testContent = `
workflow: workflow.yaml
test_scenarios:
  - name: "Test Case"
    assertions:
      - type: "state_reached"
        value: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow.test.yaml'), testContent);

    const workflows = WorkflowDiscovery.discoverWorkflows(testDir);
    
    // Should only find the workflow file, not the test file
    expect(workflows).toHaveLength(1);
    expect(workflows[0].fileName).toBe('workflow.yaml');
    expect(workflows.find(w => w.fileName === 'workflow.test.yaml')).toBeUndefined();
  });

  test('should discover .yml files', () => {
    const workflowContent = `
name: "YML Workflow"
start_state: "start"
states:
  start:
    type: "prompt"
    prompt: "Hello"
    next: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow.yml'), workflowContent);

    const workflows = WorkflowDiscovery.discoverWorkflows(testDir);
    expect(workflows).toHaveLength(1);
    expect(workflows[0].fileName).toBe('workflow.yml');
  });

  test('should exclude .test.yml files', () => {
    const workflowContent = `
name: "YML Workflow"
start_state: "start"
states:
  start:
    type: "prompt"
    prompt: "Hello"
    next: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow.yml'), workflowContent);

    const testContent = `
workflow: workflow.yml
test_scenarios:
  - name: "Test Case"
    assertions:
      - type: "state_reached"
        value: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow.test.yml'), testContent);

    const workflows = WorkflowDiscovery.discoverWorkflows(testDir);
    
    // Should only find the workflow file, not the test file
    expect(workflows).toHaveLength(1);
    expect(workflows[0].fileName).toBe('workflow.yml');
    expect(workflows.find(w => w.fileName === 'workflow.test.yml')).toBeUndefined();
  });

  test('should discover multiple workflow files', () => {
    const workflowContent = `
name: "Workflow {{num}}"
start_state: "start"
states:
  start:
    type: "prompt"
    prompt: "Hello"
    next: "end"
`;
    fs.writeFileSync(path.join(testDir, 'workflow1.yaml'), workflowContent.replace('{{num}}', '1'));
    fs.writeFileSync(path.join(testDir, 'workflow2.yaml'), workflowContent.replace('{{num}}', '2'));
    fs.writeFileSync(path.join(testDir, 'test.test.yaml'), 'workflow: workflow1.yaml\ntest_scenarios: []');

    const workflows = WorkflowDiscovery.discoverWorkflows(testDir);
    expect(workflows).toHaveLength(2);
    expect(workflows.map(w => w.fileName).sort()).toEqual(['workflow1.yaml', 'workflow2.yaml']);
  });

  test('should include invalid workflows with error information', () => {
    const invalidContent = 'invalid: yaml: content: [';
    fs.writeFileSync(path.join(testDir, 'invalid.yaml'), invalidContent);

    const workflows = WorkflowDiscovery.discoverWorkflows(testDir);
    expect(workflows).toHaveLength(1);
    expect(workflows[0].valid).toBe(false);
    expect(workflows[0].error).toBeDefined();
  });

  test('should work with examples directory', () => {
    const examplesDir = path.join(__dirname, '../../examples');
    const workflows = WorkflowDiscovery.discoverWorkflows(examplesDir);
    
    // Ensure we found some workflows
    expect(workflows.length).toBeGreaterThan(0);
    
    // Ensure no .test.yaml files are included
    const testFiles = workflows.filter(w => w.fileName.endsWith('.test.yaml'));
    expect(testFiles).toHaveLength(0);
    
    // Verify that actual workflow files are found
    const simpleQa = workflows.find(w => w.fileName === 'simple-qa.yaml');
    expect(simpleQa).toBeDefined();
    expect(simpleQa.valid).toBe(true);
  });

  test('should throw error for non-existent directory', () => {
    expect(() => {
      WorkflowDiscovery.discoverWorkflows('/non/existent/path');
    }).toThrow('Directory not found');
  });

  test('should throw error for non-directory path', () => {
    const filePath = path.join(testDir, 'file.txt');
    fs.writeFileSync(filePath, 'content');
    
    expect(() => {
      WorkflowDiscovery.discoverWorkflows(filePath);
    }).toThrow('Path is not a directory');
  });
});
