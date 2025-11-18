import { AssertionType, TestAssertionSpec, TestScenarioSpec, TestSuiteSpec } from './spec';

/**
 * Validator for test scenario files
 */
export class TestScenarioValidator {
  /**
   * Validate that a required field is present
   * @param value - Value to check
   * @param fieldName - Name of the field
   * @param context - Context for error message (e.g., "Test suite" or "Scenario 'foo'")
   * @throws Error if value is missing
   */
  private static validateRequiredField(value: any, fieldName: string, context: string): void {
    if (!value) {
      throw new Error(`${context} must have a ${fieldName}`);
    }
  }

  /**
   * Validate that a field has the expected type
   * @param value - Value to check
   * @param expectedType - Expected JavaScript type ('string', 'object', 'number', etc.)
   * @param fieldName - Name of the field
   * @param context - Context for error message (e.g., "Test suite" or "Scenario 'foo'")
   * @throws Error if type doesn't match
   */
  private static validateFieldType(value: any, expectedType: string, fieldName: string, context: string): void {
    if (typeof value !== expectedType) {
      throw new Error(`${context} ${fieldName} must be a ${expectedType}`);
    }
  }

  /**
   * Validate test suite structure
   * @param testSuite - The test suite to validate
   * @throws Error if validation fails
   */
  static validateTestSuite(testSuite: TestSuiteSpec): void {
    this.validateRequiredField(testSuite, 'test suite', 'Configuration');
    this.validateRequiredField(testSuite.workflow, 'workflow', 'Test suite');
    this.validateFieldType(testSuite.workflow, 'string', 'workflow', 'Test suite');

    this.validateRequiredField(testSuite.test_scenarios, 'test_scenarios array', 'Test suite');
    
    if (!Array.isArray(testSuite.test_scenarios)) {
      throw new Error('Test suite test_scenarios must be an array');
    }

    if (testSuite.test_scenarios.length === 0) {
      throw new Error('Test suite must contain at least one test scenario');
    }

    // Validate iterations if provided
    if (testSuite.iterations !== undefined) {
      this.validateFieldType(testSuite.iterations, 'number', 'iterations', 'Test suite');
      if (testSuite.iterations < 1) {
        throw new Error('Test suite iterations must be at least 1');
      }
    }

    // Validate each test scenario
    testSuite.test_scenarios.forEach((scenario, index) => {
      this.validateTestScenario(scenario, index);
    });
  }

  /**
   * Validate individual test scenario
   * @param scenario - The test scenario to validate
   * @param index - Index of the scenario (for error messages)
   * @throws Error if validation fails
   */
  static validateTestScenario(scenario: TestScenarioSpec, index: number): void {
    const scenarioLabel = scenario.name || `scenario at index ${index}`;

    this.validateRequiredField(scenario.name, 'name', `Test scenario at index ${index}`);
    this.validateFieldType(scenario.name, 'string', 'name', `Test scenario at index ${index}`);

    if (scenario.description !== undefined) {
      this.validateFieldType(scenario.description, 'string', 'description', `Test scenario "${scenarioLabel}"`);
    }

    this.validateRequiredField(scenario.assertions, 'assertions array', `Test scenario "${scenarioLabel}"`);
    
    if (!Array.isArray(scenario.assertions)) {
      throw new Error(`Test scenario "${scenarioLabel}" assertions must be an array`);
    }

    if (scenario.assertions.length === 0) {
      throw new Error(`Test scenario "${scenarioLabel}" must contain at least one assertion`);
    }

    // Validate iterations if provided
    if (scenario.iterations !== undefined) {
      this.validateFieldType(scenario.iterations, 'number', 'iterations', `Test scenario "${scenarioLabel}"`);
      if (scenario.iterations < 1) {
        throw new Error(`Test scenario "${scenarioLabel}" iterations must be at least 1`);
      }
    }

    // Validate inputs if provided
    if (scenario.inputs) {
      if (!Array.isArray(scenario.inputs)) {
        throw new Error(`Test scenario "${scenarioLabel}" inputs must be an array`);
      }

      scenario.inputs.forEach((input, inputIndex) => {
        this.validateRequiredField(input.state, 'state', `Input at index ${inputIndex} in scenario "${scenarioLabel}"`);
        this.validateFieldType(input.state, 'string', 'state', `Input at index ${inputIndex} in scenario "${scenarioLabel}"`);
        
        if (input.value === undefined || input.value === null) {
          throw new Error(`Input at index ${inputIndex} in scenario "${scenarioLabel}" must have a value`);
        }
        
        this.validateFieldType(input.value, 'string', 'value', `Input at index ${inputIndex} in scenario "${scenarioLabel}"`);
      });
    }

    // Validate LLM input generation if provided
    if (scenario.llm_input_generation) {
      this.validateFieldType(scenario.llm_input_generation.enabled, 'boolean', 'enabled', `LLM input generation in scenario "${scenarioLabel}"`);
      
      if (scenario.llm_input_generation.model !== undefined) {
        this.validateFieldType(scenario.llm_input_generation.model, 'string', 'model', `LLM input generation in scenario "${scenarioLabel}"`);
      }
      
      if (scenario.llm_input_generation.context !== undefined) {
        this.validateFieldType(scenario.llm_input_generation.context, 'string', 'context', `LLM input generation in scenario "${scenarioLabel}"`);
      }

      // Cannot have both predefined inputs and LLM generation enabled
      if (scenario.llm_input_generation.enabled && scenario.inputs && scenario.inputs.length > 0) {
        throw new Error(`Test scenario "${scenarioLabel}" cannot have both predefined inputs and LLM input generation enabled`);
      }
    }

    // Validate assertions
    scenario.assertions.forEach((assertion, assertionIndex) => {
      this.validateAssertion(assertion, assertionIndex, scenarioLabel);
    });
  }

  /**
   * Validate individual assertion
   * @param assertion - The assertion to validate
   * @param index - Index of the assertion (for error messages)
   * @param scenarioLabel - Label of the parent scenario
   * @throws Error if validation fails
   */
  static validateAssertion(assertion: TestAssertionSpec, index: number, scenarioLabel: string): void {
    const validTypes: AssertionType[] = ['contains', 'equals', 'regex', 'state_reached', 'not_contains'];

    this.validateRequiredField(assertion.type, 'type', `Assertion at index ${index} in scenario "${scenarioLabel}"`);

    if (!validTypes.includes(assertion.type)) {
      throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" has invalid type "${assertion.type}". Valid types: ${validTypes.join(', ')}`);
    }

    if (assertion.description !== undefined) {
      this.validateFieldType(assertion.description, 'string', 'description', `Assertion at index ${index} in scenario "${scenarioLabel}"`);
    }

    // state_reached only needs a value (the state name)
    if (assertion.type === 'state_reached') {
      this.validateRequiredField(assertion.value, 'value (state name)', `Assertion at index ${index} in scenario "${scenarioLabel}" with type "state_reached"`);
      this.validateFieldType(assertion.value!, 'string', 'value', `Assertion at index ${index} in scenario "${scenarioLabel}"`);
    } else {
      // Other assertion types need both target and value
      this.validateRequiredField(assertion.target, 'target', `Assertion at index ${index} in scenario "${scenarioLabel}" with type "${assertion.type}"`);
      this.validateFieldType(assertion.target!, 'string', 'target', `Assertion at index ${index} in scenario "${scenarioLabel}"`);
      
      if (assertion.value === undefined || assertion.value === null) {
        throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" with type "${assertion.type}" must have a value`);
      }
      
      this.validateFieldType(assertion.value, 'string', 'value', `Assertion at index ${index} in scenario "${scenarioLabel}"`);
    }

    // Validate boolean flags if present
    if (assertion.case_sensitive !== undefined && typeof assertion.case_sensitive !== 'boolean') {
      throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" case_sensitive must be a boolean`);
    }

    if (assertion.regex !== undefined && typeof assertion.regex !== 'boolean') {
      throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" regex must be a boolean`);
    }

    // Validate regex pattern if type is regex, or if regex flag is true for contains/not_contains
    if (assertion.type === 'regex' || (assertion.regex === true && (assertion.type === 'contains' || assertion.type === 'not_contains'))) {
      try {
        new RegExp(assertion.value!);
      } catch (error) {
        throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" has invalid regex pattern: ${assertion.value}`);
      }
    }
  }
}
