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
 * LLM-based input generation configuration
 */
export interface LLMInputGenerationSpec {
  /** Enable LLM-based input generation */
  enabled: boolean;
  /** Model to use for input generation (optional, defaults to workflow's default_model) */
  model?: string;
  /** Optional context to help LLM generate appropriate inputs */
  context?: string;
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
  /** LLM-based input generation configuration (alternative to predefined inputs) */
  llm_input_generation?: LLMInputGenerationSpec;
  /** Array of assertions to validate */
  assertions: TestAssertionSpec[];
  /** Number of times to run this scenario (default: 1) */
  iterations?: number;
}

/**
 * Test suite specification containing multiple scenarios
 */
export interface TestSuiteSpec {
  /** Path to workflow file to test */
  workflow: string;
  /** Array of test scenarios to run */
  test_scenarios: TestScenarioSpec[];
  /** Global number of iterations for all scenarios (can be overridden per scenario) */
  iterations?: number;
}
