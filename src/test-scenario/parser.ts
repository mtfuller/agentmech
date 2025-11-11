import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { TestSuiteSpec, TestScenarioSpec, TestAssertionSpec, TestInputSpec } from './spec';
import { TestSuite, TestScenario, TestAssertion, TestInput } from './test-scenario';
import { TestScenarioValidator } from './validator';

/**
 * Parser for test scenario files
 */
class TestScenarioParser {
  /**
   * Parse a test scenario YAML file
   * @param filePath - Path to the test scenario YAML file
   * @returns Parsed test suite
   */
  static parseFile(filePath: string): TestSuite {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const testSuiteSpec = yaml.load(fileContent) as TestSuiteSpec;
      
      return this.parseTestSuiteSpec(testSuiteSpec);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Test scenario file not found: ${filePath}`);
      }
      throw new Error(`Failed to parse test scenario: ${error.message}`);
    }
  }

  /**
   * Parse test suite specification
   * @param testSuiteSpec - Test suite specification from YAML
   * @returns Parsed test suite
   */
  static parseTestSuiteSpec(testSuiteSpec: TestSuiteSpec): TestSuite {
    TestScenarioValidator.validateTestSuite(testSuiteSpec);

    return {
      workflow: testSuiteSpec.workflow,
      test_scenarios: testSuiteSpec.test_scenarios.map(scenarioSpec => 
        this.parseTestScenarioSpec(scenarioSpec)
      )
    };
  }

  /**
   * Parse test scenario specification
   * @param scenarioSpec - Test scenario specification
   * @returns Parsed test scenario
   */
  static parseTestScenarioSpec(scenarioSpec: TestScenarioSpec): TestScenario {
    return {
      name: scenarioSpec.name,
      description: scenarioSpec.description,
      inputs: scenarioSpec.inputs?.map(inputSpec => this.parseTestInputSpec(inputSpec)),
      assertions: scenarioSpec.assertions.map(assertionSpec => 
        this.parseTestAssertionSpec(assertionSpec)
      )
    };
  }

  /**
   * Parse test input specification
   * @param inputSpec - Test input specification
   * @returns Parsed test input
   */
  static parseTestInputSpec(inputSpec: TestInputSpec): TestInput {
    return {
      state: inputSpec.state,
      value: inputSpec.value
    };
  }

  /**
   * Parse test assertion specification
   * @param assertionSpec - Test assertion specification
   * @returns Parsed test assertion
   */
  static parseTestAssertionSpec(assertionSpec: TestAssertionSpec): TestAssertion {
    return {
      type: assertionSpec.type,
      target: assertionSpec.target,
      value: assertionSpec.value,
      description: assertionSpec.description,
      case_sensitive: assertionSpec.case_sensitive,
      regex: assertionSpec.regex
    };
  }

  /**
   * Validate test suite structure
   * Delegates to TestScenarioValidator for backward compatibility
   * @param testSuite - The test suite to validate
   */
  static validateTestSuite(testSuite: TestSuiteSpec): void {
    TestScenarioValidator.validateTestSuite(testSuite);
  }

  /**
   * Validate individual test scenario
   * Delegates to TestScenarioValidator for backward compatibility
   * @param scenario - The test scenario to validate
   * @param index - Index of the scenario (for error messages)
   */
  static validateTestScenario(scenario: TestScenarioSpec, index: number): void {
    TestScenarioValidator.validateTestScenario(scenario, index);
  }

  /**
   * Validate individual assertion
   * Delegates to TestScenarioValidator for backward compatibility
   * @param assertion - The assertion to validate
   * @param index - Index of the assertion (for error messages)
   * @param scenarioLabel - Label of the parent scenario
   */
  static validateAssertion(assertion: TestAssertionSpec, index: number, scenarioLabel: string): void {
    TestScenarioValidator.validateAssertion(assertion, index, scenarioLabel);
  }
}

export = TestScenarioParser;
