import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { OrchestrationSpec, OrchestrationWorkflowSpec, WorkflowCondition } from './orchestration-spec';

/**
 * Parser for orchestration configuration files
 */
class OrchestrationParser {
  /**
   * Parse an orchestration YAML file
   * @param filePath Path to the orchestration YAML file
   * @returns Parsed and validated orchestration specification
   */
  static parseFile(filePath: string): OrchestrationSpec {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Orchestration file not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const spec = yaml.load(fileContent) as any;

    // Validate the orchestration spec
    this.validateSpec(spec, filePath);

    return spec as OrchestrationSpec;
  }

  /**
   * Validate an orchestration specification
   * @param spec The specification to validate
   * @param filePath Path to the file (for error messages)
   */
  private static validateSpec(spec: any, filePath: string): void {
    // Check required fields
    if (!spec.name) {
      throw new Error(`Orchestration must have a 'name' field: ${filePath}`);
    }

    if (!spec.strategy) {
      throw new Error(`Orchestration must have a 'strategy' field: ${filePath}`);
    }

    const validStrategies = ['sequential', 'parallel', 'conditional'];
    if (!validStrategies.includes(spec.strategy)) {
      throw new Error(`Invalid strategy '${spec.strategy}'. Must be one of: ${validStrategies.join(', ')}`);
    }

    if (!spec.workflows || !Array.isArray(spec.workflows)) {
      throw new Error(`Orchestration must have a 'workflows' array: ${filePath}`);
    }

    if (spec.workflows.length === 0) {
      throw new Error(`Orchestration must have at least one workflow: ${filePath}`);
    }

    // Validate each workflow
    const workflowIds = new Set<string>();
    for (let i = 0; i < spec.workflows.length; i++) {
      const workflow = spec.workflows[i];
      this.validateWorkflow(workflow, i, filePath);
      
      // Check for duplicate IDs
      if (workflowIds.has(workflow.id)) {
        throw new Error(`Duplicate workflow ID '${workflow.id}' in orchestration: ${filePath}`);
      }
      workflowIds.add(workflow.id);
    }

    // Validate dependencies exist
    for (const workflow of spec.workflows) {
      if (workflow.depends_on) {
        for (const depId of workflow.depends_on) {
          if (!workflowIds.has(depId)) {
            throw new Error(`Workflow '${workflow.id}' depends on non-existent workflow '${depId}': ${filePath}`);
          }
        }
      }
    }

    // Validate result aggregation
    if (spec.result_aggregation) {
      const validAggregations = ['merge', 'last', 'custom'];
      if (!validAggregations.includes(spec.result_aggregation)) {
        throw new Error(`Invalid result_aggregation '${spec.result_aggregation}'. Must be one of: ${validAggregations.join(', ')}`);
      }

      if (spec.result_aggregation === 'custom' && !spec.aggregation_prompt) {
        throw new Error(`Custom result aggregation requires 'aggregation_prompt' field: ${filePath}`);
      }
    }

    // Validate conditional strategy requirements
    if (spec.strategy === 'conditional') {
      for (const workflow of spec.workflows) {
        if (!workflow.condition && !workflow.depends_on) {
          console.warn(`Warning: Workflow '${workflow.id}' in conditional orchestration has no condition or dependencies. It will always execute.`);
        }
      }
    }
  }

  /**
   * Validate a single workflow specification
   * @param workflow The workflow to validate
   * @param index Index in the workflows array (for error messages)
   * @param filePath Path to the orchestration file (for error messages)
   */
  private static validateWorkflow(workflow: any, index: number, filePath: string): void {
    if (!workflow.id) {
      throw new Error(`Workflow at index ${index} must have an 'id' field: ${filePath}`);
    }

    if (!workflow.workflow) {
      throw new Error(`Workflow '${workflow.id}' must have a 'workflow' field specifying the path: ${filePath}`);
    }

    // Validate on_error values
    if (workflow.on_error) {
      const validOnError = ['fail', 'continue', 'fallback'];
      if (!validOnError.includes(workflow.on_error)) {
        throw new Error(`Invalid on_error '${workflow.on_error}' for workflow '${workflow.id}'. Must be one of: ${validOnError.join(', ')}`);
      }

      if (workflow.on_error === 'fallback' && !workflow.fallback_workflow) {
        throw new Error(`Workflow '${workflow.id}' has on_error='fallback' but no 'fallback_workflow' specified: ${filePath}`);
      }
    }

    // Validate condition if present
    if (workflow.condition) {
      this.validateCondition(workflow.condition, workflow.id, filePath);
    }

    // Validate timeout
    if (workflow.timeout !== undefined) {
      if (typeof workflow.timeout !== 'number' || workflow.timeout <= 0) {
        throw new Error(`Workflow '${workflow.id}' timeout must be a positive number: ${filePath}`);
      }
    }

    // Validate depends_on
    if (workflow.depends_on) {
      if (!Array.isArray(workflow.depends_on)) {
        throw new Error(`Workflow '${workflow.id}' depends_on must be an array: ${filePath}`);
      }
    }
  }

  /**
   * Validate a workflow condition
   * @param condition The condition to validate
   * @param workflowId The workflow ID (for error messages)
   * @param filePath Path to the orchestration file (for error messages)
   */
  private static validateCondition(condition: any, workflowId: string, filePath: string): void {
    if (!condition.variable) {
      throw new Error(`Condition for workflow '${workflowId}' must have a 'variable' field: ${filePath}`);
    }

    if (!condition.operator) {
      throw new Error(`Condition for workflow '${workflowId}' must have an 'operator' field: ${filePath}`);
    }

    const validOperators = ['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists'];
    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Invalid operator '${condition.operator}' in condition for workflow '${workflowId}'. Must be one of: ${validOperators.join(', ')}`);
    }

    // Check if value is required for this operator
    const operatorsRequiringValue = ['equals', 'not_equals', 'contains', 'not_contains'];
    if (operatorsRequiringValue.includes(condition.operator) && condition.value === undefined) {
      throw new Error(`Condition operator '${condition.operator}' requires a 'value' field for workflow '${workflowId}': ${filePath}`);
    }
  }
}

export = OrchestrationParser;
