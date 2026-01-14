const WorkflowParser = require('../../dist/workflow/parser');
const { WorkflowValidator } = require('../../dist/workflow/validator');
const path = require('path');

describe('Temperature Demo Workflow Integration', () => {
  let workflow;

  beforeAll(() => {
    const filePath = path.join(__dirname, '../../examples/temperature-demo.yaml');
    workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
  });

  test('should parse temperature-demo.yaml successfully', () => {
    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Temperature Demonstration Workflow');
  });

  test('should have correct workflow structure', () => {
    expect(workflow.startState).toBe('explain_temperature');
    expect(workflow.states).toHaveProperty('explain_temperature');
    expect(workflow.states).toHaveProperty('creative_high_temp');
    expect(workflow.states).toHaveProperty('deterministic_low_temp');
    expect(workflow.states).toHaveProperty('compare_results');
    expect(workflow.states).toHaveProperty('demonstrate_seed');
  });

  test('should have high temperature options in creative_high_temp state', () => {
    const state = workflow.states.creative_high_temp;
    expect(state.options).toBeDefined();
    expect(state.options.temperature).toBe(1.2);
    expect(state.options.top_p).toBe(0.95);
  });

  test('should have low temperature options in deterministic_low_temp state', () => {
    const state = workflow.states.deterministic_low_temp;
    expect(state.options).toBeDefined();
    expect(state.options.temperature).toBe(0.1);
    expect(state.options.top_p).toBe(0.9);
  });

  test('should have moderate temperature in compare_results state', () => {
    const state = workflow.states.compare_results;
    expect(state.options).toBeDefined();
    expect(state.options.temperature).toBe(0.7);
  });

  test('should have seed option in demonstrate_seed state', () => {
    const state = workflow.states.demonstrate_seed;
    expect(state.options).toBeDefined();
    expect(state.options.temperature).toBe(1.0);
    expect(state.options.seed).toBe(42);
  });

  test('should have correct state transitions', () => {
    expect(workflow.states.explain_temperature.next).toBe('creative_high_temp');
    expect(workflow.states.creative_high_temp.next).toBe('deterministic_low_temp');
    expect(workflow.states.deterministic_low_temp.next).toBe('compare_results');
    expect(workflow.states.compare_results.next).toBe('demonstrate_seed');
    expect(workflow.states.demonstrate_seed.next).toBe('end');
  });

  test('should use variables correctly', () => {
    const compareState = workflow.states.compare_results;
    expect(compareState.prompt).toContain('{{creative_story}}');
    expect(compareState.prompt).toContain('{{deterministic_story}}');
  });

  test('should have save_as configured for all states', () => {
    expect(workflow.states.explain_temperature.saveAs).toBe('explanation');
    expect(workflow.states.creative_high_temp.saveAs).toBe('creative_story');
    expect(workflow.states.deterministic_low_temp.saveAs).toBe('deterministic_story');
    expect(workflow.states.compare_results.saveAs).toBe('comparison');
    expect(workflow.states.demonstrate_seed.saveAs).toBe('seeded_result');
  });

  test('should validate successfully', () => {
    const filePath = path.join(__dirname, '../../examples/temperature-demo.yaml');
    expect(() => {
      const workflow = WorkflowParser.parseFile({workflowDir: '', filePath, visitedFiles: new Set()});
      // Implicitly validates during parsing
    }).not.toThrow();
  });
});
