const TestScenarioParser = require('../../dist/testing/test-scenario-parser').TestScenarioParser;
const path = require('path');

describe('Test Scenario Parser', () => {
  test('should parse valid test scenario file', () => {
    const testSuite = TestScenarioParser.parseFile(
      path.join(__dirname, '../../examples/user-input-demo.test.yaml')
    );
    expect(testSuite.workflow).toBe('user-input-demo.yaml');
    expect(testSuite.test_scenarios.length).toBeGreaterThan(0);
  });

  test('should detect missing workflow field', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        test_scenarios: [
          { name: 'Test', assertions: [{ type: 'state_reached', value: 'end' }] }
        ]
      });
    }).toThrow();
  });

  test('should detect missing test_scenarios', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml'
      });
    }).toThrow();
  });

  test('should detect empty test_scenarios', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: []
      });
    }).toThrow();
  });

  test('should detect missing scenario name', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          { assertions: [{ type: 'state_reached', value: 'end' }] }
        ]
      });
    }).toThrow();
  });

  test('should detect missing assertions', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          { name: 'Test' }
        ]
      });
    }).toThrow();
  });

  test('should detect empty assertions', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          { name: 'Test', assertions: [] }
        ]
      });
    }).toThrow();
  });

  test('should detect invalid assertion type', () => {
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

  test('should accept valid state_reached assertion', () => {
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

  test('should accept valid contains assertion', () => {
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

  test('should detect missing target in contains assertion', () => {
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

  test('should accept valid inputs array', () => {
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

  test('should detect invalid regex pattern', () => {
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

  test('should accept contains with case_sensitive flag', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'contains', target: 'answer', value: 'test', case_sensitive: false }]
          }
        ]
      });
    }).not.toThrow();
  });

  test('should accept contains with regex flag', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'contains', target: 'answer', value: '[a-z]+', regex: true }]
          }
        ]
      });
    }).not.toThrow();
  });

  test('should detect invalid regex pattern in contains with regex flag', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'contains', target: 'var', value: '[invalid(', regex: true }]
          }
        ]
      });
    }).toThrow();
  });

  test('should accept not_contains with case_sensitive and regex flags', () => {
    expect(() => {
      TestScenarioParser.validateTestSuite({
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test',
            assertions: [{ type: 'not_contains', target: 'answer', value: '[0-9]+', regex: true, case_sensitive: false }]
          }
        ]
      });
    }).not.toThrow();
  });
});

