import WorkflowParser = require('../core/workflow-parser');
import WorkflowExecutor = require('../core/workflow-executor');
import { TestScenario, TestAssertion, TestInput } from './test-scenario-parser';
import Tracer = require('../utils/tracer');

/**
 * Result of a single assertion
 */
export interface AssertionResult {
  assertion: TestAssertion;
  passed: boolean;
  message: string;
}

/**
 * Result of a test scenario execution
 */
export interface TestScenarioResult {
  scenario: TestScenario;
  passed: boolean;
  assertions: AssertionResult[];
  error?: string;
  duration: number;  // Execution time in milliseconds
}

/**
 * Executor for running workflow tests
 */
export class TestExecutor {
  private ollamaUrl: string;

  constructor(ollamaUrl: string = 'http://localhost:11434') {
    this.ollamaUrl = ollamaUrl;
  }

  /**
   * Execute a single test scenario
   * @param workflowPath - Path to the workflow file
   * @param scenario - Test scenario to execute
   * @returns Test scenario result
   */
  async executeTestScenario(workflowPath: string, scenario: TestScenario): Promise<TestScenarioResult> {
    const startTime = Date.now();
    const result: TestScenarioResult = {
      scenario,
      passed: false,
      assertions: [],
      duration: 0
    };

    try {
      // Parse workflow
      const workflow = WorkflowParser.parseFile(workflowPath);

      // Create a tracer that captures events
      const tracer = new Tracer(false); // Don't output to console during tests
      
      // Create executor with mock inputs
      const executor = new TestWorkflowExecutor(
        workflow,
        this.ollamaUrl,
        tracer,
        scenario.inputs || []
      );

      // Execute the workflow
      await executor.execute();

      // Evaluate assertions
      result.assertions = this.evaluateAssertions(
        scenario.assertions,
        executor.getContext(),
        executor.getStateHistory()
      );

      // Check if all assertions passed
      result.passed = result.assertions.every(a => a.passed);

    } catch (error: any) {
      result.error = error.message;
      result.passed = false;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Evaluate all assertions for a test scenario
   * @param assertions - Assertions to evaluate
   * @param context - Workflow execution context (variables)
   * @param stateHistory - History of visited states
   * @returns Array of assertion results
   */
  private evaluateAssertions(
    assertions: TestAssertion[],
    context: Record<string, any>,
    stateHistory: string[]
  ): AssertionResult[] {
    return assertions.map(assertion => this.evaluateAssertion(assertion, context, stateHistory));
  }

  /**
   * Evaluate a single assertion
   * @param assertion - Assertion to evaluate
   * @param context - Workflow execution context
   * @param stateHistory - History of visited states
   * @returns Assertion result
   */
  evaluateAssertion(
    assertion: TestAssertion,
    context: Record<string, any>,
    stateHistory: string[]
  ): AssertionResult {
    try {
      switch (assertion.type) {
        case 'state_reached':
          return this.evaluateStateReached(assertion, stateHistory);
        
        case 'equals':
          return this.evaluateEquals(assertion, context);
        
        case 'contains':
          return this.evaluateContains(assertion, context);
        
        case 'not_contains':
          return this.evaluateNotContains(assertion, context);
        
        case 'regex':
          return this.evaluateRegex(assertion, context);
        
        default:
          return {
            assertion,
            passed: false,
            message: `Unknown assertion type: ${assertion.type}`
          };
      }
    } catch (error: any) {
      return {
        assertion,
        passed: false,
        message: `Error evaluating assertion: ${error.message}`
      };
    }
  }

  private evaluateStateReached(assertion: TestAssertion, stateHistory: string[]): AssertionResult {
    const stateName = assertion.value!;
    const reached = stateHistory.includes(stateName);
    
    return {
      assertion,
      passed: reached,
      message: reached
        ? `State "${stateName}" was reached`
        : `State "${stateName}" was not reached. States visited: ${stateHistory.join(', ')}`
    };
  }

  private evaluateEquals(assertion: TestAssertion, context: Record<string, any>): AssertionResult {
    const target = assertion.target!;
    const expectedValue = assertion.value!;
    const actualValue = context[target];

    if (actualValue === undefined) {
      return {
        assertion,
        passed: false,
        message: `Variable "${target}" not found in context`
      };
    }

    const passed = this.normalizeString(actualValue) === this.normalizeString(expectedValue);
    
    return {
      assertion,
      passed,
      message: passed
        ? `Variable "${target}" equals expected value`
        : `Variable "${target}" value mismatch. Expected: "${expectedValue}", Got: "${actualValue}"`
    };
  }

  private evaluateContains(assertion: TestAssertion, context: Record<string, any>): AssertionResult {
    const target = assertion.target!;
    const expectedSubstring = assertion.value!;
    const actualValue = context[target];

    if (actualValue === undefined) {
      return {
        assertion,
        passed: false,
        message: `Variable "${target}" not found in context`
      };
    }

    const caseSensitive = assertion.case_sensitive ?? true; // Default to true
    const useRegex = assertion.regex ?? false; // Default to false
    const normalizedValue = this.normalizeString(actualValue);
    const normalizedExpected = this.normalizeString(expectedSubstring);

    let passed: boolean;
    let matchDescription: string;

    if (useRegex) {
      // Treat value as a regex pattern
      try {
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(normalizedExpected, flags);
        passed = regex.test(normalizedValue);
        matchDescription = caseSensitive ? `pattern /${normalizedExpected}/` : `pattern /${normalizedExpected}/i`;
      } catch (error) {
        return {
          assertion,
          passed: false,
          message: `Invalid regex pattern "${normalizedExpected}": ${(error as Error).message}`
        };
      }
    } else {
      // String contains check
      if (caseSensitive) {
        passed = normalizedValue.includes(normalizedExpected);
        matchDescription = `"${normalizedExpected}"`;
      } else {
        passed = normalizedValue.toLowerCase().includes(normalizedExpected.toLowerCase());
        matchDescription = `"${normalizedExpected}" (case-insensitive)`;
      }
    }
    
    return {
      assertion,
      passed,
      message: passed
        ? `Variable "${target}" contains ${matchDescription}`
        : `Variable "${target}" does not contain ${matchDescription}. Value: "${actualValue}"`
    };
  }

  private evaluateNotContains(assertion: TestAssertion, context: Record<string, any>): AssertionResult {
    const target = assertion.target!;
    const unexpectedSubstring = assertion.value!;
    const actualValue = context[target];

    if (actualValue === undefined) {
      return {
        assertion,
        passed: false,
        message: `Variable "${target}" not found in context`
      };
    }

    const caseSensitive = assertion.case_sensitive ?? true; // Default to true
    const useRegex = assertion.regex ?? false; // Default to false
    const normalizedValue = this.normalizeString(actualValue);
    const normalizedUnexpected = this.normalizeString(unexpectedSubstring);

    let passed: boolean;
    let matchDescription: string;

    if (useRegex) {
      // Treat value as a regex pattern
      try {
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(normalizedUnexpected, flags);
        passed = !regex.test(normalizedValue);
        matchDescription = caseSensitive ? `pattern /${normalizedUnexpected}/` : `pattern /${normalizedUnexpected}/i`;
      } catch (error) {
        return {
          assertion,
          passed: false,
          message: `Invalid regex pattern "${normalizedUnexpected}": ${(error as Error).message}`
        };
      }
    } else {
      // String contains check
      if (caseSensitive) {
        passed = !normalizedValue.includes(normalizedUnexpected);
        matchDescription = `"${normalizedUnexpected}"`;
      } else {
        passed = !normalizedValue.toLowerCase().includes(normalizedUnexpected.toLowerCase());
        matchDescription = `"${normalizedUnexpected}" (case-insensitive)`;
      }
    }
    
    return {
      assertion,
      passed,
      message: passed
        ? `Variable "${target}" does not contain ${matchDescription}`
        : `Variable "${target}" contains unexpected ${matchDescription}. Value: "${actualValue}"`
    };
  }

  private evaluateRegex(assertion: TestAssertion, context: Record<string, any>): AssertionResult {
    const target = assertion.target!;
    const pattern = assertion.value!;
    const actualValue = context[target];

    if (actualValue === undefined) {
      return {
        assertion,
        passed: false,
        message: `Variable "${target}" not found in context`
      };
    }

    const regex = new RegExp(pattern);
    const passed = regex.test(this.normalizeString(actualValue));
    
    return {
      assertion,
      passed,
      message: passed
        ? `Variable "${target}" matches pattern /${pattern}/`
        : `Variable "${target}" does not match pattern /${pattern}/. Value: "${actualValue}"`
    };
  }

  /**
   * Normalize a value to a trimmed string for comparison
   * @param value - Value to normalize
   * @returns Trimmed string representation
   */
  private normalizeString(value: any): string {
    return String(value).trim();
  }
}

/**
 * Extended WorkflowExecutor for testing with mocked inputs
 * This class captures execution context and state history for assertion evaluation
 * 
 * It extends the base WorkflowExecutor to:
 * - Mock user inputs for automated testing
 * - Track state execution history for assertions
 * - Expose workflow context for validation
 * 
 * @extends WorkflowExecutor
 */
class TestWorkflowExecutor extends WorkflowExecutor {
  private mockInputs: Map<string, string>;
  private stateHistory: string[] = [];
  private currentStateName: string = '';

  /**
   * Create a test workflow executor
   * @param workflow - Workflow configuration to execute
   * @param ollamaUrl - URL of the Ollama API
   * @param tracer - Tracer instance for logging
   * @param inputs - Array of mocked inputs for input states
   */
  constructor(workflow: any, ollamaUrl: string, tracer: Tracer, inputs: TestInput[]) {
    super(workflow, ollamaUrl, tracer);
    
    // Convert inputs array to map for easy lookup
    this.mockInputs = new Map();
    inputs.forEach(input => {
      this.mockInputs.set(input.state, input.value);
    });
    
    // Replace readline interface with mock after construction
    this.replaceReadlineWithMock();
  }

  /**
   * Replace the readline interface with a mock version
   * Note: Uses type assertion to access private 'rl' property since we need to
   * replace it for testing without modifying the base class API
   */
  private replaceReadlineWithMock(): void {
    const originalRl = (this as any).rl;  // Access private property for testing
    if (originalRl) {
      originalRl.close();
    }
    
    const mockRl = {
      question: (query: string, callback: (answer: string) => void) => {
        const answer = this.mockInputs.get(this.currentStateName) || '';
        setImmediate(() => callback(answer));
      },
      close: () => {
        // No-op
      }
    };
    
    (this as any).rl = mockRl;  // Replace private property for testing
  }

  /**
   * Override to track state history and current state
   */
  async executeState(stateName: string, state: any): Promise<string> {
    this.stateHistory.push(stateName);
    this.currentStateName = stateName;
    const nextState = await super.executeState(stateName, state);
    
    // If the next state is 'end', add it to history since the main loop won't execute it
    if (nextState === 'end') {
      this.stateHistory.push('end');
    }
    
    return nextState;
  }

  /**
   * Get the execution context (variables)
   * Note: Uses type assertion to access private 'context' property from parent class
   * This is necessary for test validation without exposing it in the public API
   */
  getContext(): Record<string, any> {
    return (this as any).context;  // Access private property for testing
  }

  /**
   * Get the state history
   */
  getStateHistory(): string[] {
    return this.stateHistory;
  }
}
