import * as path from 'path';
import * as fs from 'fs';
import { OrchestrationSpec, OrchestrationWorkflowSpec, WorkflowCondition } from './orchestration-spec';
import WorkflowParser = require('./parser');
import WorkflowExecutor = require('./executor');
import { Workflow } from './workflow';
import Tracer = require('../utils/tracer');
import OllamaClient = require('../ollama/ollama-client');
import CliFormatter from '../utils/cli-formatter';

/**
 * Result from executing a single workflow within an orchestration
 */
interface WorkflowResult {
  workflowId: string;
  success: boolean;
  context: Record<string, any>;
  error?: string;
  duration: number;
}

/**
 * Executes orchestrated workflows
 */
class OrchestrationExecutor {
  private orchestration: OrchestrationSpec;
  private ollamaUrl: string;
  private tracer: Tracer;
  private sharedContext: Record<string, any>;
  private workflowResults: Map<string, WorkflowResult>;
  private orchestrationDir: string;

  constructor(orchestration: OrchestrationSpec, orchestrationDir: string, ollamaUrl: string, tracer: Tracer) {
    this.orchestration = orchestration;
    this.orchestrationDir = orchestrationDir;
    this.ollamaUrl = ollamaUrl;
    this.tracer = tracer;
    this.sharedContext = { ...(orchestration.shared_context || {}) };
    this.workflowResults = new Map();
  }

  /**
   * Execute the orchestration
   * @returns Final aggregated result
   */
  async execute(): Promise<Record<string, any>> {
    console.log(CliFormatter.header(`\n🎭 Starting Orchestration: ${this.orchestration.name}`));
    if (this.orchestration.description) {
      console.log(CliFormatter.info(`Description: ${this.orchestration.description}`));
    }
    console.log(CliFormatter.info(`Strategy: ${this.orchestration.strategy}\n`));

    this.tracer.trace('orchestration_start', {
      name: this.orchestration.name,
      strategy: this.orchestration.strategy,
      workflowCount: this.orchestration.workflows.length
    });

    const startTime = Date.now();

    try {
      let results: Record<string, any> = {};

      switch (this.orchestration.strategy) {
        case 'sequential':
          results = await this.executeSequential();
          break;
        case 'parallel':
          results = await this.executeParallel();
          break;
        case 'conditional':
          results = await this.executeConditional();
          break;
      }

      const duration = Date.now() - startTime;

      // Aggregate results
      const aggregatedResult = await this.aggregateResults(results);

      this.tracer.trace('orchestration_complete', {
        name: this.orchestration.name,
        duration,
        successCount: Array.from(this.workflowResults.values()).filter(r => r.success).length,
        totalCount: this.workflowResults.size
      });

      console.log(CliFormatter.success(`\n✅ Orchestration completed in ${(duration / 1000).toFixed(2)}s\n`));

      return aggregatedResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.tracer.trace('orchestration_error', {
        name: this.orchestration.name,
        error: error.message,
        duration
      });

      console.error(CliFormatter.error(`\n❌ Orchestration failed: ${error.message}\n`));
      throw error;
    }
  }

  /**
   * Execute workflows sequentially
   */
  private async executeSequential(): Promise<Record<string, any>> {
    console.log(CliFormatter.info('📋 Executing workflows sequentially...\n'));

    const results: Record<string, any> = {};

    for (const workflowSpec of this.orchestration.workflows) {
      const result = await this.executeWorkflow(workflowSpec);
      
      if (result.success) {
        // Merge result context into shared context
        Object.assign(this.sharedContext, result.context);
        
        // Save specific result if save_as is specified
        if (workflowSpec.save_as) {
          results[workflowSpec.save_as] = result.context;
        }
      } else if (workflowSpec.on_error === 'fail' || !workflowSpec.on_error) {
        // By default, fail on error in sequential mode
        throw new Error(`Workflow '${workflowSpec.id}' failed: ${result.error}`);
      }
      // If on_error is 'continue', just continue to next workflow
    }

    return results;
  }

  /**
   * Execute workflows in parallel
   */
  private async executeParallel(): Promise<Record<string, any>> {
    console.log(CliFormatter.info('⚡ Executing workflows in parallel...\n'));

    // Create execution promises for all workflows
    const promises = this.orchestration.workflows.map(workflowSpec =>
      this.executeWorkflow(workflowSpec)
    );

    // Wait for all workflows to complete
    const workflowResults = await Promise.all(promises);

    const results: Record<string, any> = {};

    // Process results
    for (let i = 0; i < workflowResults.length; i++) {
      const result = workflowResults[i];
      const workflowSpec = this.orchestration.workflows[i];

      if (result.success) {
        // Merge context
        Object.assign(this.sharedContext, result.context);
        
        if (workflowSpec.save_as) {
          results[workflowSpec.save_as] = result.context;
        }
      } else if (workflowSpec.on_error === 'fail' || !workflowSpec.on_error) {
        throw new Error(`Workflow '${workflowSpec.id}' failed: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Execute workflows conditionally based on context
   */
  private async executeConditional(): Promise<Record<string, any>> {
    console.log(CliFormatter.info('🔀 Executing workflows conditionally...\n'));

    const results: Record<string, any> = {};
    const executed = new Set<string>();
    const pending = new Set(this.orchestration.workflows.map(w => w.id));

    // Keep executing until no more workflows can be executed
    while (pending.size > 0) {
      let anyExecuted = false;

      for (const workflowSpec of this.orchestration.workflows) {
        if (executed.has(workflowSpec.id) || !pending.has(workflowSpec.id)) {
          continue;
        }

        // Check dependencies
        if (workflowSpec.depends_on) {
          const depsReady = workflowSpec.depends_on.every(depId => executed.has(depId));
          if (!depsReady) {
            continue;
          }
        }

        // Check condition
        if (workflowSpec.condition) {
          const conditionMet = this.evaluateCondition(workflowSpec.condition);
          if (!conditionMet) {
            console.log(CliFormatter.warning(`⏭️  Skipping workflow '${workflowSpec.id}' - condition not met`));
            pending.delete(workflowSpec.id);
            executed.add(workflowSpec.id);
            anyExecuted = true;
            continue;
          }
        }

        // Execute workflow
        const result = await this.executeWorkflow(workflowSpec);
        executed.add(workflowSpec.id);
        pending.delete(workflowSpec.id);
        anyExecuted = true;

        if (result.success) {
          Object.assign(this.sharedContext, result.context);
          
          if (workflowSpec.save_as) {
            results[workflowSpec.save_as] = result.context;
          }
        } else if (workflowSpec.on_error === 'fail' || !workflowSpec.on_error) {
          throw new Error(`Workflow '${workflowSpec.id}' failed: ${result.error}`);
        }
      }

      // If no workflow was executed in this iteration, we have circular dependencies or unsatisfied conditions
      if (!anyExecuted) {
        const remainingWorkflows = Array.from(pending).join(', ');
        console.warn(CliFormatter.warning(`⚠️  Cannot execute remaining workflows due to unsatisfied dependencies or conditions: ${remainingWorkflows}`));
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single workflow
   */
  private async executeWorkflow(workflowSpec: OrchestrationWorkflowSpec): Promise<WorkflowResult> {
    console.log(CliFormatter.header(`\n▶️  Executing workflow: ${workflowSpec.id}`));
    if (workflowSpec.description) {
      console.log(CliFormatter.info(`   ${workflowSpec.description}`));
    }

    const startTime = Date.now();
    const workflowId = workflowSpec.id;

    this.tracer.trace('workflow_start', {
      orchestrationWorkflowId: workflowId,
      workflowPath: workflowSpec.workflow
    });

    try {
      // Resolve workflow path relative to orchestration file
      const workflowPath = path.resolve(this.orchestrationDir, workflowSpec.workflow);
      
      if (!fs.existsSync(workflowPath)) {
        throw new Error(`Workflow file not found: ${workflowPath}`);
      }

      // Parse workflow
      const workflow = WorkflowParser.parseFile({
        filePath: workflowPath,
        workflowDir: path.dirname(workflowPath),
        visitedFiles: new Set()
      });

      // Merge variables: shared context + workflow-specific variables
      const mergedVariables = {
        ...this.sharedContext,
        ...(workflowSpec.variables || {})
      };

      // Update workflow variables
      workflow.variables = {
        ...workflow.variables,
        ...mergedVariables
      };

      // Create executor
      const executor = new WorkflowExecutor(workflow, this.ollamaUrl, this.tracer);

      // Execute workflow with timeout if specified
      let executionPromise = executor.execute();
      
      if (workflowSpec.timeout) {
        executionPromise = this.withTimeout(executionPromise, workflowSpec.timeout, workflowId);
      }

      await executionPromise;
      const duration = Date.now() - startTime;

      console.log(CliFormatter.success(`✅ Workflow '${workflowId}' completed in ${(duration / 1000).toFixed(2)}s`));

      // The workflow executor doesn't expose context directly, so we use merged variables
      // and shared context as the result for now
      const result: WorkflowResult = {
        workflowId,
        success: true,
        context: mergedVariables,
        duration
      };

      this.workflowResults.set(workflowId, result);
      
      this.tracer.trace('workflow_complete', {
        orchestrationWorkflowId: workflowId,
        duration
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error(CliFormatter.error(`❌ Workflow '${workflowId}' failed: ${error.message}`));

      this.tracer.trace('workflow_error', {
        orchestrationWorkflowId: workflowId,
        error: error.message,
        duration
      });

      // Handle fallback
      if (workflowSpec.on_error === 'fallback' && workflowSpec.fallback_workflow) {
        console.log(CliFormatter.warning(`🔄 Attempting fallback workflow for '${workflowId}'...`));
        
        const fallbackSpec: OrchestrationWorkflowSpec = {
          id: `${workflowId}_fallback`,
          workflow: workflowSpec.fallback_workflow,
          variables: workflowSpec.variables
        };

        return await this.executeWorkflow(fallbackSpec);
      }

      const result: WorkflowResult = {
        workflowId,
        success: false,
        context: {},
        error: error.message,
        duration
      };

      this.workflowResults.set(workflowId, result);
      return result;
    }
  }

  /**
   * Wrap a promise with a timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutSeconds: number, workflowId: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Workflow '${workflowId}' timed out after ${timeoutSeconds}s`)), timeoutSeconds * 1000)
      )
    ]);
  }

  /**
   * Evaluate a condition against the shared context
   */
  private evaluateCondition(condition: WorkflowCondition): boolean {
    const value = this.sharedContext[condition.variable];

    switch (condition.operator) {
      case 'exists':
        return value !== undefined;
      case 'not_exists':
        return value === undefined;
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(condition.value));
      case 'not_contains':
        return typeof value === 'string' && !value.includes(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Aggregate results from all workflows
   */
  private async aggregateResults(results: Record<string, any>): Promise<Record<string, any>> {
    const aggregationType = this.orchestration.result_aggregation || 'merge';

    console.log(CliFormatter.info(`\n📊 Aggregating results using '${aggregationType}' strategy...`));

    switch (aggregationType) {
      case 'merge':
        // Merge all workflow results and shared context
        return {
          ...this.sharedContext,
          ...results
        };

      case 'last':
        // Return the last workflow's result
        const workflowKeys = Object.keys(results);
        if (workflowKeys.length > 0) {
          const lastKey = workflowKeys[workflowKeys.length - 1];
          return results[lastKey];
        }
        return this.sharedContext;

      case 'custom':
        // Use LLM to aggregate results
        return await this.customAggregation(results);

      default:
        return results;
    }
  }

  /**
   * Use LLM to perform custom aggregation of results
   */
  private async customAggregation(results: Record<string, any>): Promise<Record<string, any>> {
    if (!this.orchestration.aggregation_prompt) {
      throw new Error('Custom aggregation requires aggregation_prompt');
    }

    const model = this.orchestration.aggregation_model || this.orchestration.default_model || 'gemma3:4b';

    console.log(CliFormatter.info(`Using model '${model}' for custom aggregation...`));

    // Prepare context for aggregation
    const contextStr = JSON.stringify({
      sharedContext: this.sharedContext,
      workflowResults: results
    }, null, 2);

    const prompt = this.orchestration.aggregation_prompt.replace('{{results}}', contextStr);

    // Call LLM
    const ollamaClient = new OllamaClient(this.ollamaUrl, this.tracer);
    
    console.log(CliFormatter.info('Generating aggregated result...\n'));
    
    const messages = [{ role: 'user', content: prompt }];
    const response = await ollamaClient.chat(model, messages, {});

    console.log(CliFormatter.success('Aggregation complete\n'));
    console.log(CliFormatter.info(`Result: ${response.substring(0, 200)}...`));

    return {
      aggregatedResult: response,
      originalResults: results,
      sharedContext: this.sharedContext
    };
  }
}

export = OrchestrationExecutor;
