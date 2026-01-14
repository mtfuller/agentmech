const OrchestrationParser = require('../../dist/workflow/orchestration-parser');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Orchestration Parser', () => {
  let tempDir;
  
  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestration-test-'));
  });
  
  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should parse valid sequential orchestration', () => {
    const filePath = path.join(__dirname, '../../examples/orchestration-sequential.yaml');
    const orchestration = OrchestrationParser.parseFile(filePath);
    
    expect(orchestration.name).toBe('Sequential Research and Writing Pipeline');
    expect(orchestration.strategy).toBe('sequential');
    expect(orchestration.workflows).toHaveLength(3);
    expect(orchestration.workflows[0].id).toBe('research');
  });
  
  test('should parse valid parallel orchestration', () => {
    const filePath = path.join(__dirname, '../../examples/orchestration-parallel.yaml');
    const orchestration = OrchestrationParser.parseFile(filePath);
    
    expect(orchestration.name).toBe('Parallel Multi-Agent Analysis');
    expect(orchestration.strategy).toBe('parallel');
    expect(orchestration.result_aggregation).toBe('custom');
    expect(orchestration.aggregation_prompt).toBeDefined();
  });
  
  test('should parse valid conditional orchestration', () => {
    const filePath = path.join(__dirname, '../../examples/orchestration-conditional.yaml');
    const orchestration = OrchestrationParser.parseFile(filePath);
    
    expect(orchestration.name).toBe('Conditional Workflow Orchestration');
    expect(orchestration.strategy).toBe('conditional');
    expect(orchestration.workflows.some(w => w.condition)).toBe(true);
  });

  test('should reject orchestration without name', () => {
    const testFile = path.join(tempDir, 'no-name.yaml');
    fs.writeFileSync(testFile, `
strategy: sequential
workflows:
  - id: test
    workflow: test.yaml
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have a \'name\' field');
  });

  test('should reject orchestration without strategy', () => {
    const testFile = path.join(tempDir, 'no-strategy.yaml');
    fs.writeFileSync(testFile, `
name: Test
workflows:
  - id: test
    workflow: test.yaml
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have a \'strategy\' field');
  });

  test('should reject orchestration with invalid strategy', () => {
    const testFile = path.join(tempDir, 'invalid-strategy.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: invalid
workflows:
  - id: test
    workflow: test.yaml
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('Invalid strategy');
  });

  test('should reject orchestration without workflows', () => {
    const testFile = path.join(tempDir, 'no-workflows.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have a \'workflows\' array');
  });

  test('should reject workflow without id', () => {
    const testFile = path.join(tempDir, 'no-workflow-id.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - workflow: test.yaml
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have an \'id\' field');
  });

  test('should reject workflow without workflow path', () => {
    const testFile = path.join(tempDir, 'no-workflow-path.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have a \'workflow\' field');
  });

  test('should reject duplicate workflow IDs', () => {
    const testFile = path.join(tempDir, 'duplicate-ids.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test
    workflow: test1.yaml
  - id: test
    workflow: test2.yaml
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('Duplicate workflow ID');
  });

  test('should reject non-existent dependency', () => {
    const testFile = path.join(tempDir, 'invalid-dependency.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test1
    workflow: test1.yaml
    depends_on: ["non_existent"]
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('depends on non-existent workflow');
  });

  test('should reject invalid on_error value', () => {
    const testFile = path.join(tempDir, 'invalid-on-error.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test
    workflow: test.yaml
    on_error: invalid
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('Invalid on_error');
  });

  test('should reject fallback without fallback_workflow', () => {
    const testFile = path.join(tempDir, 'fallback-no-workflow.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test
    workflow: test.yaml
    on_error: fallback
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('no \'fallback_workflow\' specified');
  });

  test('should reject condition without variable', () => {
    const testFile = path.join(tempDir, 'condition-no-variable.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: conditional
workflows:
  - id: test
    workflow: test.yaml
    condition:
      operator: equals
      value: true
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have a \'variable\' field');
  });

  test('should reject condition without operator', () => {
    const testFile = path.join(tempDir, 'condition-no-operator.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: conditional
workflows:
  - id: test
    workflow: test.yaml
    condition:
      variable: test
      value: true
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('must have an \'operator\' field');
  });

  test('should reject condition with invalid operator', () => {
    const testFile = path.join(tempDir, 'condition-invalid-operator.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: conditional
workflows:
  - id: test
    workflow: test.yaml
    condition:
      variable: test
      operator: invalid
      value: true
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('Invalid operator');
  });

  test('should reject custom aggregation without prompt', () => {
    const testFile = path.join(tempDir, 'custom-agg-no-prompt.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
result_aggregation: custom
workflows:
  - id: test
    workflow: test.yaml
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('requires \'aggregation_prompt\' field');
  });

  test('should accept valid timeout value', () => {
    const testFile = path.join(tempDir, 'valid-timeout.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test
    workflow: test.yaml
    timeout: 300
`);
    
    const orchestration = OrchestrationParser.parseFile(testFile);
    expect(orchestration.workflows[0].timeout).toBe(300);
  });

  test('should reject invalid timeout value', () => {
    const testFile = path.join(tempDir, 'invalid-timeout.yaml');
    fs.writeFileSync(testFile, `
name: Test
strategy: sequential
workflows:
  - id: test
    workflow: test.yaml
    timeout: -10
`);
    
    expect(() => {
      OrchestrationParser.parseFile(testFile);
    }).toThrow('timeout must be a positive number');
  });
});
