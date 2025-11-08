import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test input for mocking user interactions
 */
export interface TestInput {
  state: string;          // State name where input should be provided
  value: string;          // Value to provide as input
}

/**
 * Assertion types for validating workflow execution
 */
export type AssertionType = 'contains' | 'equals' | 'regex' | 'state_reached' | 'not_contains';

/**
 * Assertion for validating workflow outcomes
 */
export interface TestAssertion {
  type: AssertionType;
  target?: string;        // Variable name or state name to check
  value?: string;         // Expected value or pattern
  description?: string;   // Optional description of what this assertion validates
  case_sensitive?: boolean; // For contains/not_contains: whether to match case-sensitively (default: true)
  regex?: boolean;        // For contains/not_contains: whether to treat value as regex pattern (default: false)
}

/**
 * Individual test scenario
 */
export interface TestScenario {
  name: string;
  description?: string;
  inputs?: TestInput[];
  assertions: TestAssertion[];
}

/**
 * Test suite containing multiple scenarios
 */
export interface TestSuite {
  workflow: string;       // Path to workflow file to test
  test_scenarios: TestScenario[];
}

/**
 * Parser for test scenario files
 */
export class TestScenarioParser {
  /**
   * Parse a test scenario YAML file
   * @param filePath - Path to the test scenario YAML file
   * @returns Parsed test suite
   */
  static parseFile(filePath: string): TestSuite {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const testSuite = yaml.load(fileContent) as TestSuite;
      
      this.validateTestSuite(testSuite);
      
      return testSuite;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Test scenario file not found: ${filePath}`);
      }
      throw new Error(`Failed to parse test scenario: ${error.message}`);
    }
  }

  /**
   * Validate test suite structure
   * @param testSuite - The test suite to validate
   */
  static validateTestSuite(testSuite: TestSuite): void {
    if (!testSuite) {
      throw new Error('Test suite is empty');
    }

    if (!testSuite.workflow) {
      throw new Error('Test suite must specify a workflow file');
    }

    if (!testSuite.test_scenarios || !Array.isArray(testSuite.test_scenarios)) {
      throw new Error('Test suite must contain test_scenarios array');
    }

    if (testSuite.test_scenarios.length === 0) {
      throw new Error('Test suite must contain at least one test scenario');
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
   */
  static validateTestScenario(scenario: TestScenario, index: number): void {
    const scenarioLabel = scenario.name || `scenario at index ${index}`;

    if (!scenario.name) {
      throw new Error(`Test scenario at index ${index} must have a name`);
    }

    if (!scenario.assertions || !Array.isArray(scenario.assertions)) {
      throw new Error(`Test scenario "${scenarioLabel}" must contain assertions array`);
    }

    if (scenario.assertions.length === 0) {
      throw new Error(`Test scenario "${scenarioLabel}" must contain at least one assertion`);
    }

    // Validate inputs if provided
    if (scenario.inputs) {
      if (!Array.isArray(scenario.inputs)) {
        throw new Error(`Test scenario "${scenarioLabel}" inputs must be an array`);
      }

      scenario.inputs.forEach((input, inputIndex) => {
        if (!input.state) {
          throw new Error(`Input at index ${inputIndex} in scenario "${scenarioLabel}" must have a state`);
        }
        if (input.value === undefined || input.value === null) {
          throw new Error(`Input at index ${inputIndex} in scenario "${scenarioLabel}" must have a value`);
        }
      });
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
   */
  static validateAssertion(assertion: TestAssertion, index: number, scenarioLabel: string): void {
    const validTypes: AssertionType[] = ['contains', 'equals', 'regex', 'state_reached', 'not_contains'];

    if (!assertion.type) {
      throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" must have a type`);
    }

    if (!validTypes.includes(assertion.type)) {
      throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" has invalid type "${assertion.type}". Valid types: ${validTypes.join(', ')}`);
    }

    // state_reached only needs a value (the state name)
    if (assertion.type === 'state_reached') {
      if (!assertion.value) {
        throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" with type "state_reached" must have a value (state name)`);
      }
    } else {
      // Other assertion types need both target and value
      if (!assertion.target) {
        throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" with type "${assertion.type}" must have a target`);
      }
      if (assertion.value === undefined || assertion.value === null) {
        throw new Error(`Assertion at index ${index} in scenario "${scenarioLabel}" with type "${assertion.type}" must have a value`);
      }
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
