/**
 * Specification for test scenario YAML files.
 * Represents the YAML structure for defining workflow tests.
 */

/**
 * Test input for mocking user interactions
 */
export interface TestInputSpec {
  /** State name where input should be provided */
  state: string;
  /** Value to provide as input */
  value: string;
}

/**
 * Assertion types for validating workflow execution
 */
export type AssertionType = 'contains' | 'equals' | 'regex' | 'state_reached' | 'not_contains';

/**
 * Assertion for validating workflow outcomes
 */
export interface TestAssertionSpec {
  /** Type of assertion to perform */
  type: AssertionType;
  /** Variable name or state name to check */
  target?: string;
  /** Expected value or pattern */
  value?: string;
  /** Optional description of what this assertion validates */
  description?: string;
  /** For contains/not_contains: whether to match case-sensitively (default: true) */
  case_sensitive?: boolean;
  /** For contains/not_contains: whether to treat value as regex pattern (default: false) */
  regex?: boolean;
}

/**
 * Individual test scenario specification
 */
export interface TestScenarioSpec {
  /** Name of the test scenario */
  name: string;
  /** Optional description of what this test validates */
  description?: string;
  /** Array of mocked inputs for input states */
  inputs?: TestInputSpec[];
  /** Array of assertions to validate */
  assertions: TestAssertionSpec[];
}

/**
 * Test suite specification containing multiple scenarios
 */
export interface TestSuiteSpec {
  /** Path to workflow file to test */
  workflow: string;
  /** Array of test scenarios to run */
  test_scenarios: TestScenarioSpec[];
}
