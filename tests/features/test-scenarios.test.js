const TestScenarioParser = require('../../dist/test-scenario-parser').TestScenarioParser;
const path = require('path');

describe('Test Scenario Parser', () => {
  test('Parse valid test scenario file', () => {
    const testSuite = TestScenarioParser.parseFile(
      path.join(__dirname, '../../examples/user-input-demo.test.yaml')
    );
    expect(testSuite.workflow).toBe('user-input-demo.yaml');
    expect(testSuite.test_scenarios.length).toBeGreaterThan(0);
  });
  
  test('Detect missing workflow field', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        test_scenarios: [
          { name: 'Test', assertions: [{ type: 'state_reached', value: 'end' }] }
        ]
      });
    }).toThrow();
  });
  
  test('Detect missing test_scenarios', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml'
      });
    }).toThrow();
  });
  
  test('Detect empty test_scenarios', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: []
      });
    }).toThrow();
  });
  
  test('Detect missing scenario name', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          { assertions: [{ type: 'state_reached', value: 'end' }] }
        ]
      });
    }).toThrow();
  });
  
  test('Detect missing assertions', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          { name: 'Test' }
        ]
      });
    }).toThrow();
  });
  
  test('Detect empty assertions', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          { name: 'Test', assertions: [] }
        ]
      });
    }).toThrow();
  });
  
  test('Detect invalid assertion type', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'invalid', target: 'var', value: 'test' }]
          }
        ]
      });
    }).toThrow();
  });
  
  test('Accept valid state_reached assertion', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'state_reached', value: 'end' }]
          }
        ]
      });
    }).not.toThrow();
  });
  
  test('Accept valid contains assertion', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'contains', target: 'answer', value: 'test' }]
          }
        ]
      });
    }).not.toThrow();
  });
  
  test('Detect missing target in contains assertion', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'contains', value: 'test' }]
          }
        ]
      });
    }).toThrow();
  });
  
  test('Accept valid inputs array', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            inputs: [{ state: 'test_state', value: 'test_value' }],
            assertions: [{ type: 'state_reached', value: 'end' }]
          }
        ]
      });
    }).not.toThrow();
  });
  
  test('Detect invalid regex pattern', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'regex', target: 'var', value: '[invalid(' }]
          }
        ]
      });
    }).toThrow();
  });
});
