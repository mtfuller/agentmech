const TestScenarioParser = require('../../dist/test-scenario/parser');
const TestScenarioValidator = require('../../dist/test-scenario/validator');

describe('LLM Input Generation Feature', () => {
  describe('Validation', () => {
    it('should accept test scenario with llm_input_generation', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            llm_input_generation: {
              enabled: true,
              model: 'gemma3:4b',
              context: 'Generate realistic inputs'
            },
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

    it('should accept minimal llm_input_generation config', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            llm_input_generation: {
              enabled: true
            },
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

    it('should reject scenario with both inputs and llm_input_generation enabled', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            inputs: [
              {
                state: 'test_state',
                value: 'test_value'
              }
            ],
            llm_input_generation: {
              enabled: true
            },
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).toThrow(/cannot have both predefined inputs and LLM input generation/);
    });

    it('should accept scenario with inputs and llm_input_generation disabled', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            inputs: [
              {
                state: 'test_state',
                value: 'test_value'
              }
            ],
            llm_input_generation: {
              enabled: false
            },
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

    it('should reject invalid model type', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            llm_input_generation: {
              enabled: true,
              model: 123  // Should be string
            },
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).toThrow(/model must be a string/);
    });

    it('should reject invalid context type', () => {
      const testSuite = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            llm_input_generation: {
              enabled: true,
              context: ['array']  // Should be string
            },
            assertions: [
              {
                type: 'state_reached',
                value: 'end'
              }
            ]
          }
        ]
      };

      expect(() => TestScenarioValidator.TestScenarioValidator.validateTestSuite(testSuite)).toThrow(/context must be a string/);
    });
  });

  describe('Parser', () => {
    it('should parse llm_input_generation config', () => {
      const testSuiteSpec = {
        workflow: 'test.yaml',
        test_scenarios: [
          {
            name: 'Test 1',
            llm_input_generation: {
              enabled: true,
              model: 'gemma3:4b',
              context: 'Test context'
            },
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
      const scenario = parsed.test_scenarios[0];
      
      expect(scenario.llmInputGeneration).toBeDefined();
      expect(scenario.llmInputGeneration.enabled).toBe(true);
      expect(scenario.llmInputGeneration.model).toBe('gemma3:4b');
      expect(scenario.llmInputGeneration.context).toBe('Test context');
    });

    it('should handle undefined llm_input_generation', () => {
      const testSuiteSpec = {
        workflow: 'test.yaml',
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
      expect(parsed.test_scenarios[0].llmInputGeneration).toBeUndefined();
    });
  });
});
