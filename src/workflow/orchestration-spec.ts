/**
 * Specification for orchestration configuration.
 * Defines how multiple workflows coordinate to perform complex tasks.
 */

/**
 * Execution strategy for workflows in the orchestration
 */
export type ExecutionStrategy = 'sequential' | 'parallel' | 'conditional';

/**
 * Condition for conditional workflow execution
 */
export interface WorkflowCondition {
  /** Variable name to check */
  variable: string;
  
  /** Operator for comparison */
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  
  /** Value to compare against (not needed for exists/not_exists) */
  value?: any;
}

/**
 * Specification for a single workflow within an orchestration
 */
export interface OrchestrationWorkflowSpec {
  /** Unique identifier for this workflow in the orchestration */
  id: string;
  
  /** Path to the workflow YAML file */
  workflow: string;
  
  /** Optional description of this workflow's role */
  description?: string;
  
  /** Variables to pass to this workflow (overrides workflow's own variables) */
  variables?: Record<string, any>;
  
  /** Variable name to save this workflow's final result */
  save_as?: string;
  
  /** Condition that must be met for this workflow to execute (for conditional strategy) */
  condition?: WorkflowCondition;
  
  /** Dependencies - workflow IDs that must complete before this one starts */
  depends_on?: string[];
  
  /** Maximum execution time in seconds (optional timeout) */
  timeout?: number;
  
  /** What to do on error: 'fail' (stop orchestration), 'continue' (continue to next), 'fallback' (use fallback workflow) */
  on_error?: 'fail' | 'continue' | 'fallback';
  
  /** Fallback workflow to run if this workflow fails (only used when on_error is 'fallback') */
  fallback_workflow?: string;
}

/**
 * Main orchestration specification
 */
export interface OrchestrationSpec {
  /** Name of the orchestration */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Default Ollama model for all workflows (can be overridden) */
  default_model?: string;
  
  /** Execution strategy: how workflows are coordinated */
  strategy: ExecutionStrategy;
  
  /** List of workflows to orchestrate */
  workflows: OrchestrationWorkflowSpec[];
  
  /** Shared context/variables available to all workflows */
  shared_context?: Record<string, any>;
  
  /** How to aggregate results: 'merge' (merge all results), 'last' (use last result), 'custom' (use aggregation_prompt) */
  result_aggregation?: 'merge' | 'last' | 'custom';
  
  /** Optional prompt for custom result aggregation using LLM */
  aggregation_prompt?: string;
  
  /** Model to use for aggregation (if using custom aggregation) */
  aggregation_model?: string;
}
