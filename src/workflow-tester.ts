import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import WorkflowParser = require('./workflow-parser');

/**
 * Test assertion types
 */
interface Assertion {
  type: 'contains' | 'equals' | 'not_contains' | 'regex' | 'variable_set';
  target?: string;  // Variable name or 'output' for console output
  value?: string;   // Expected value
  pattern?: string; // For regex type
}

/**
 * Mock response for a state
 */
interface MockResponse {
  state: string;
  response: string;
}

/**
 * User input for interactive states
 */
interface UserInput {
  state: string;
  input: string | number;  // String for input states, number for choice states
}

/**
 * Test scenario definition
 */
interface TestScenario {
  name: string;
  description?: string;
  inputs?: UserInput[];        // User inputs for choice/input states
  mocks?: MockResponse[];      // Mock LLM responses
  assertions: Assertion[];     // Assertions to validate
  timeout?: number;            // Timeout in milliseconds (default: 30000)
}

/**
 * Test suite definition
 */
interface TestSuite {
  workflow: string;            // Path to workflow file
  scenarios: TestScenario[];
}

/**
 * Test result for a single assertion
 */
interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message: string;
  actual?: string;
}

/**
 * Test result for a single scenario
 */
interface ScenarioResult {
  scenario: TestScenario;
  passed: boolean;
  error?: string;
  assertions: AssertionResult[];
  duration: number;  // milliseconds
  output: string[];  // Captured console output
}

/**
 * Test result for entire suite
 */
interface SuiteResult {
  testSuite: TestSuite;
  scenarios: ScenarioResult[];
  totalPassed: number;
  totalFailed: number;
  duration: number;  // milliseconds
}

/**
 * Workflow tester class
 */
class WorkflowTester {
  private testSuite: TestSuite;
  private workflowPath: string;

  constructor(testFilePath: string) {
    const fileContent = fs.readFileSync(testFilePath, 'utf8');
    this.testSuite = yaml.load(fileContent) as TestSuite;
    
    // Resolve workflow path relative to test file
    const testDir = path.dirname(testFilePath);
    this.workflowPath = path.resolve(testDir, this.testSuite.workflow);
    
    this.validateTestSuite();
  }

  /**
   * Validate test suite structure
   */
  private validateTestSuite(): void {
    if (!this.testSuite.workflow) {
      throw new Error('Test suite must specify a workflow file');
    }

    if (!this.testSuite.scenarios || !Array.isArray(this.testSuite.scenarios)) {
      throw new Error('Test suite must have a scenarios array');
    }

    if (this.testSuite.scenarios.length === 0) {
      throw new Error('Test suite must have at least one scenario');
    }

    // Validate each scenario
    this.testSuite.scenarios.forEach((scenario, index) => {
      if (!scenario.name) {
        throw new Error(`Scenario at index ${index} must have a name`);
      }

      if (!scenario.assertions || !Array.isArray(scenario.assertions)) {
        throw new Error(`Scenario "${scenario.name}" must have assertions`);
      }

      if (scenario.assertions.length === 0) {
        throw new Error(`Scenario "${scenario.name}" must have at least one assertion`);
      }

      // Validate assertions
      scenario.assertions.forEach((assertion, aIndex) => {
        const validTypes = ['contains', 'equals', 'not_contains', 'regex', 'variable_set'];
        if (!validTypes.includes(assertion.type)) {
          throw new Error(
            `Assertion ${aIndex} in scenario "${scenario.name}" has invalid type "${assertion.type}"`
          );
        }

        if (assertion.type === 'regex' && !assertion.pattern) {
          throw new Error(
            `Regex assertion ${aIndex} in scenario "${scenario.name}" must have a pattern`
          );
        }

        if (assertion.type !== 'variable_set' && assertion.type !== 'regex' && !assertion.value) {
          throw new Error(
            `Assertion ${aIndex} in scenario "${scenario.name}" must have a value`
          );
        }
      });
    });
  }

  /**
   * Run all test scenarios
   */
  async runTests(): Promise<SuiteResult> {
    const startTime = Date.now();
    const results: ScenarioResult[] = [];

    console.log(`\n=== Running Test Suite for: ${this.testSuite.workflow} ===\n`);

    for (const scenario of this.testSuite.scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);
    }

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;
    const duration = Date.now() - startTime;

    return {
      testSuite: this.testSuite,
      scenarios: results,
      totalPassed,
      totalFailed,
      duration
    };
  }

  /**
   * Run a single test scenario by simulating workflow execution
   */
  private async runScenario(scenario: TestScenario): Promise<ScenarioResult> {
    console.log(`\nRunning: ${scenario.name}`);
    if (scenario.description) {
      console.log(`Description: ${scenario.description}`);
    }

    const startTime = Date.now();
    const assertionResults: AssertionResult[] = [];
    let error: string | undefined;
    const capturedOutput: string[] = [];
    const context: Record<string, any> = {};

    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      capturedOutput.push(message);
      originalLog.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      capturedOutput.push(message);
      originalError.apply(console, args);
    };

    try {
      // Parse workflow
      const workflow = WorkflowParser.parseFile(this.workflowPath);

      // Build mock and input maps
      const mockMap = new Map<string, string>();
      if (scenario.mocks) {
        scenario.mocks.forEach(mock => mockMap.set(mock.state, mock.response));
      }

      const inputMap = new Map<string, string | number>();
      if (scenario.inputs) {
        scenario.inputs.forEach(input => inputMap.set(input.state, input.input));
      }

      // Simulate workflow execution
      await this.simulateWorkflow(workflow, mockMap, inputMap, context, capturedOutput);

      // Run assertions
      for (const assertion of scenario.assertions) {
        const result = this.evaluateAssertion(assertion, context, capturedOutput);
        assertionResults.push(result);
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
    }

    const duration = Date.now() - startTime;
    const passed = !error && assertionResults.every(r => r.passed);

    // Print results
    if (passed) {
      console.log(`✓ PASSED (${duration}ms)`);
    } else {
      console.log(`✗ FAILED (${duration}ms)`);
      if (error) {
        console.log(`  Error: ${error}`);
      }
      assertionResults.filter(r => !r.passed).forEach(r => {
        console.log(`  ✗ ${r.message}`);
      });
    }

    return {
      scenario,
      passed,
      error,
      assertions: assertionResults,
      duration,
      output: capturedOutput
    };
  }

  /**
   * Simulate workflow execution with mocks and inputs
   */
  private async simulateWorkflow(
    workflow: any,
    mockMap: Map<string, string>,
    inputMap: Map<string, string | number>,
    context: Record<string, any>,
    output: string[]
  ): Promise<void> {
    const END_STATE = 'end';
    let currentState = workflow.start_state;

    console.log(`\n=== Starting Workflow: ${workflow.name} ===\n`);
    if (workflow.description) {
      console.log(`${workflow.description}\n`);
    }

    while (currentState && currentState !== END_STATE) {
      const state = workflow.states[currentState];
      if (!state) {
        throw new Error(`State "${currentState}" not found in workflow`);
      }

      console.log(`\n--- State: ${currentState} ---`);

      const nextState = await this.simulateState(
        currentState,
        state,
        mockMap,
        inputMap,
        context
      );

      currentState = nextState;
    }

    console.log('\n=== Workflow Completed ===\n');
  }

  /**
   * Simulate execution of a single state
   */
  private async simulateState(
    stateName: string,
    state: any,
    mockMap: Map<string, string>,
    inputMap: Map<string, string | number>,
    context: Record<string, any>
  ): Promise<string> {
    switch (state.type) {
      case 'prompt':
        return await this.simulatePromptState(stateName, state, mockMap, context);
      
      case 'choice':
        return await this.simulateChoiceState(stateName, state, inputMap, context);
      
      case 'input':
        return await this.simulateInputState(stateName, state, inputMap, context);
      
      case 'transition':
        return state.next || 'end';
      
      case 'end':
        return 'end';
      
      default:
        throw new Error(`Unknown state type: ${state.type}`);
    }
  }

  /**
   * Simulate a prompt state
   */
  private async simulatePromptState(
    stateName: string,
    state: any,
    mockMap: Map<string, string>,
    context: Record<string, any>
  ): Promise<string> {
    const prompt = this.interpolateVariables(state.prompt || '', context);
    console.log(`\nPrompt: ${prompt}`);

    if (!mockMap.has(stateName)) {
      throw new Error(`No mock response provided for prompt state "${stateName}"`);
    }

    const response = mockMap.get(stateName)!;
    console.log(`[MOCK] Using mock response`);
    console.log(`Response: ${response}\n`);

    if (state.save_as) {
      context[state.save_as] = response;
    }

    return state.next || 'end';
  }

  /**
   * Simulate a choice state
   */
  private async simulateChoiceState(
    stateName: string,
    state: any,
    inputMap: Map<string, string | number>,
    context: Record<string, any>
  ): Promise<string> {
    if (state.prompt) {
      console.log(`\n${this.interpolateVariables(state.prompt, context)}`);
    }

    console.log('\nChoices:');
    state.choices.forEach((choice: any, index: number) => {
      console.log(`  ${index + 1}. ${choice.label || choice.value}`);
    });

    if (!inputMap.has(stateName)) {
      throw new Error(`No input provided for choice state "${stateName}"`);
    }

    const choiceIndex = inputMap.get(stateName) as number;
    
    if (choiceIndex < 1 || choiceIndex > state.choices.length) {
      throw new Error(`Invalid choice index ${choiceIndex} for state "${stateName}"`);
    }

    const selectedChoice = state.choices[choiceIndex - 1];
    console.log(`\n[TEST] Selected: ${selectedChoice.label || selectedChoice.value}`);

    if (state.save_as) {
      context[state.save_as] = selectedChoice.value || selectedChoice.label;
    }

    return selectedChoice.next || state.next || 'end';
  }

  /**
   * Simulate an input state
   */
  private async simulateInputState(
    stateName: string,
    state: any,
    inputMap: Map<string, string | number>,
    context: Record<string, any>
  ): Promise<string> {
    if (state.prompt) {
      console.log(`\n${this.interpolateVariables(state.prompt, context)}`);
    }

    if (!inputMap.has(stateName)) {
      throw new Error(`No input provided for input state "${stateName}"`);
    }

    const inputValue = String(inputMap.get(stateName));
    console.log(`[TEST] Input: ${inputValue}`);

    if (state.save_as) {
      context[state.save_as] = inputValue;
    }

    return state.next || 'end';
  }

  /**
   * Interpolate variables in a string
   */
  private interpolateVariables(text: string, context: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return context[varName] !== undefined ? String(context[varName]) : match;
    });
  }

  /**
   * Evaluate a single assertion
   */
  private evaluateAssertion(
    assertion: Assertion,
    context: Record<string, any>,
    output: string[]
  ): AssertionResult {
    const target = assertion.target || 'output';
    let actual: string;

    if (target === 'output') {
      // Check console output
      actual = output.join('\n');
    } else {
      // Check context variable
      actual = context[target] !== undefined ? String(context[target]) : '';
    }

    let passed = false;
    let message = '';

    switch (assertion.type) {
      case 'contains':
        passed = actual.includes(assertion.value!);
        message = passed
          ? `"${target}" contains "${assertion.value}"`
          : `"${target}" does not contain "${assertion.value}"`;
        break;

      case 'not_contains':
        passed = !actual.includes(assertion.value!);
        message = passed
          ? `"${target}" does not contain "${assertion.value}"`
          : `"${target}" contains "${assertion.value}" (should not)`;
        break;

      case 'equals':
        passed = actual === assertion.value;
        message = passed
          ? `"${target}" equals "${assertion.value}"`
          : `"${target}" is "${actual}", expected "${assertion.value}"`;
        break;

      case 'regex':
        const regex = new RegExp(assertion.pattern!);
        passed = regex.test(actual);
        message = passed
          ? `"${target}" matches pattern /${assertion.pattern}/`
          : `"${target}" does not match pattern /${assertion.pattern}/`;
        break;

      case 'variable_set':
        passed = context[assertion.target!] !== undefined;
        message = passed
          ? `Variable "${assertion.target}" is set`
          : `Variable "${assertion.target}" is not set`;
        actual = passed ? String(context[assertion.target!]) : 'undefined';
        break;
    }

    return {
      assertion,
      passed,
      message,
      actual
    };
  }

  /**
   * Generate test report
   */
  generateReport(result: SuiteResult): string {
    const lines: string[] = [];

    lines.push('\n========================================');
    lines.push('         TEST REPORT');
    lines.push('========================================\n');

    lines.push(`Workflow: ${this.testSuite.workflow}`);
    lines.push(`Total Scenarios: ${result.scenarios.length}`);
    lines.push(`Passed: ${result.totalPassed}`);
    lines.push(`Failed: ${result.totalFailed}`);
    lines.push(`Duration: ${result.duration}ms\n`);

    // Detailed scenario results
    result.scenarios.forEach((scenarioResult, index) => {
      lines.push(`\n${index + 1}. ${scenarioResult.scenario.name}`);
      lines.push(`   Status: ${scenarioResult.passed ? '✓ PASSED' : '✗ FAILED'}`);
      lines.push(`   Duration: ${scenarioResult.duration}ms`);

      if (scenarioResult.error) {
        lines.push(`   Error: ${scenarioResult.error}`);
      }

      if (scenarioResult.assertions.length > 0) {
        lines.push('   Assertions:');
        scenarioResult.assertions.forEach(assertion => {
          const status = assertion.passed ? '✓' : '✗';
          lines.push(`     ${status} ${assertion.message}`);
          if (!assertion.passed && assertion.actual) {
            lines.push(`       Actual: ${assertion.actual.substring(0, 100)}${assertion.actual.length > 100 ? '...' : ''}`);
          }
        });
      }
    });

    lines.push('\n========================================');
    lines.push(result.totalFailed === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    lines.push('========================================\n');

    return lines.join('\n');
  }
}

export = WorkflowTester;
