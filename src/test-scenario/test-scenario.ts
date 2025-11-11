/**
 * Runtime types for test scenario execution.
 * These are the internal representations used during test execution.
 */

/**
 * Test input for mocking user interactions
 */
export interface TestInput {
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
export interface TestAssertion {
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
 * Individual test scenario
 */
export interface TestScenario {
  /** Name of the test scenario */
  name: string;
  /** Optional description of what this test validates */
  description?: string;
  /** Array of mocked inputs for input states */
  inputs?: TestInput[];
  /** Array of assertions to validate */
  assertions: TestAssertion[];
}

/**
 * Test suite containing multiple scenarios
 */
export interface TestSuite {
  /** Path to workflow file to test */
  workflow: string;
  /** Array of test scenarios to run */
  test_scenarios: TestScenario[];
}
