const TestScenarioParser = require('../../dist/test-scenario/parser');
const TestScenarioValidator = require('../../dist/test-scenario/validator');
const path = require('path');

describe('Test Iterations Feature', () => {
  describe('Validation', () => {
    it('should accept test suite with iterations field', () => {
      const testSuite = {
        workflow: 'test.yaml',
        iterations: 5,
        test_scenarios: [
          {
            name: 'Test 1',
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).not.toThrow();
    });

    it('should accept test scenario with iterations field', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            iterations: 10,
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).not.toThrow();
    });

    it('should reject negative iterations', () => {
      const testSuite = {
        workflow: 'test.yaml',
        iterations: -1,
        test_scenarios: [
          {
            name: 'Test 1',
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).toThrow(/iterations must be at least 1/);
    });

    it('should reject zero iterations', () => {
      const testSuite = {
        workflow: 'test.yaml',
        iterations: 0,
        test_scenarios: [
          {
            name: 'Test 1',
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).toThrow(/iterations must be at least 1/);
    });
  });

  describe('Parser', () => {
    it('should parse test suite with iterations', () => {
      const testSuiteSpec = {
        workflow: 'test.yaml',
        iterations: 3,
        test_scenarios: [
          {
            name: 'Test 1',
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      const parsed = TestScenarioParser.parseTestSuiteSpec(testSuiteSpec);
      expect(parsed.iterations).toBe(3);
    });

    it('should parse test scenario with iterations', () => {
      const testSuiteSpec = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            iterations: 5,
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      const parsed = TestScenarioParser.parseTestSuiteSpec(testSuiteSpec);
      expect(parsed.test_scenarios[0].iterations).toBe(5);
    });
  });
});
