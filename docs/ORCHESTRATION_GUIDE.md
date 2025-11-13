# Workflow Orchestration Guide

The `agentmech orchestrate` command enables you to coordinate multiple workflows to create sophisticated multi-agent systems that work together autonomously to accomplish complex tasks.

## Table of Contents

- [Overview](#overview)
- [Basic Concepts](#basic-concepts)
- [Orchestration YAML Format](#orchestration-yaml-format)
- [Execution Strategies](#execution-strategies)
- [Data Sharing](#data-sharing)
- [Error Handling](#error-handling)
- [Result Aggregation](#result-aggregation)
- [Use Cases](#use-cases)
- [Best Practices](#best-practices)

## Overview

Orchestration allows you to:
- **Coordinate multiple workflows** to work together on complex tasks
- **Execute workflows in parallel** for faster processing
- **Chain workflows sequentially** where each builds on previous results
- **Conditionally execute workflows** based on runtime context
- **Share data** between workflows through shared context
- **Aggregate results** from multiple agents into a cohesive output

## Basic Concepts

### Orchestration File
An orchestration file is a YAML configuration that defines:
- Which workflows to run
- How they should coordinate (strategy)
- What data they share
- How errors are handled
- How results are aggregated

### Workflows
Each workflow in an orchestration is a standard AgentMech workflow YAML file. Workflows can be:
- Simple Q&A workflows
- Complex multi-step workflows
- Interactive workflows with user input
- Any valid AgentMech workflow

### Shared Context
A key-value store that all workflows can access. Workflows can:
- Read values from shared context
- Write results back to shared context
- Pass data to subsequent workflows

## Orchestration YAML Format

### Required Fields

```yaml
name: "My Orchestration"
strategy: "sequential"  # sequential, parallel, or conditional
workflows:
  - id: "workflow1"
    workflow: "path/to/workflow.yaml"
```

### Complete Example

```yaml
name: "Content Creation Pipeline"
description: "Multi-agent system for content creation"
default_model: "gemma3:4b"
strategy: "sequential"

# Initial context available to all workflows
shared_context:
  topic: "machine learning"
  audience: "beginners"
  tone: "educational"

workflows:
  - id: "research"
    workflow: "research-agent.yaml"
    description: "Research the topic thoroughly"
    variables:
      subject: "{{topic}}"
    save_as: "research_data"
    timeout: 300
    on_error: "fail"
  
  - id: "outline"
    workflow: "outliner-agent.yaml"
    description: "Create content outline"
    variables:
      research: "{{research_data}}"
      target_audience: "{{audience}}"
    save_as: "content_outline"
  
  - id: "write"
    workflow: "writer-agent.yaml"
    description: "Write the content"
    variables:
      outline: "{{content_outline}}"
      style: "{{tone}}"
    save_as: "draft"
  
  - id: "review"
    workflow: "reviewer-agent.yaml"
    description: "Review and refine"
    variables:
      content: "{{draft}}"
    save_as: "final_content"

result_aggregation: "last"
```

### Workflow Specification

Each workflow in the `workflows` array supports:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for this workflow |
| `workflow` | string | Yes | Path to workflow YAML file (relative to orchestration file) |
| `description` | string | No | Human-readable description |
| `variables` | object | No | Variables to pass to the workflow (can use {{}} interpolation) |
| `save_as` | string | No | Variable name to save workflow results |
| `depends_on` | array | No | List of workflow IDs that must complete first |
| `condition` | object | No | Condition for execution (conditional strategy only) |
| `timeout` | number | No | Maximum execution time in seconds |
| `on_error` | string | No | Error handling: `fail`, `continue`, or `fallback` |
| `fallback_workflow` | string | No | Backup workflow if this one fails (requires `on_error: fallback`) |

## Execution Strategies

### Sequential Strategy

Workflows execute one after another in the order defined.

```yaml
strategy: "sequential"
workflows:
  - id: "step1"
    workflow: "workflow1.yaml"
    save_as: "result1"
  
  - id: "step2"
    workflow: "workflow2.yaml"
    variables:
      input: "{{result1}}"
    save_as: "result2"
  
  - id: "step3"
    workflow: "workflow3.yaml"
    variables:
      data: "{{result2}}"
```

**When to use:**
- Tasks must be completed in order
- Each workflow depends on previous results
- You want predictable, deterministic execution

**Characteristics:**
- Workflows run one at a time
- Later workflows can use results from earlier ones
- By default, any failure stops the orchestration
- Total time is sum of all workflow times

### Parallel Strategy

All workflows execute simultaneously.

```yaml
strategy: "parallel"
workflows:
  - id: "technical_review"
    workflow: "technical-agent.yaml"
    save_as: "technical_perspective"
  
  - id: "business_review"
    workflow: "business-agent.yaml"
    save_as: "business_perspective"
  
  - id: "legal_review"
    workflow: "legal-agent.yaml"
    save_as: "legal_perspective"

result_aggregation: "custom"
aggregation_prompt: |
  Synthesize these three perspectives:
  {{results}}
```

**When to use:**
- Workflows are independent
- You want maximum speed
- Tasks can be done simultaneously

**Characteristics:**
- All workflows start at the same time
- Workflows cannot depend on each other's results
- Execution time equals longest workflow time
- Results are collected when all complete

### Conditional Strategy

Workflows execute based on conditions and dependencies.

```yaml
strategy: "conditional"
workflows:
  - id: "detector"
    workflow: "detect-type.yaml"
    save_as: "content_type"
  
  - id: "process_image"
    workflow: "image-processor.yaml"
    depends_on: ["detector"]
    condition:
      variable: "content_type"
      operator: "equals"
      value: "image"
  
  - id: "process_text"
    workflow: "text-processor.yaml"
    depends_on: ["detector"]
    condition:
      variable: "content_type"
      operator: "equals"
      value: "text"
  
  - id: "finalize"
    workflow: "finalizer.yaml"
    depends_on: ["process_image", "process_text"]
```

**When to use:**
- Execution path depends on runtime data
- You have branching logic
- Different workflows for different scenarios

**Characteristics:**
- Workflows execute when conditions are met
- Supports complex dependency chains
- Respects both `depends_on` and `condition`
- Skips workflows whose conditions aren't met

### Condition Operators

| Operator | Description | Requires Value |
|----------|-------------|----------------|
| `equals` | Variable equals value | Yes |
| `not_equals` | Variable doesn't equal value | Yes |
| `contains` | Variable (string) contains value | Yes |
| `not_contains` | Variable (string) doesn't contain value | Yes |
| `exists` | Variable is defined | No |
| `not_exists` | Variable is not defined | No |

Example conditions:

```yaml
# Check if variable equals value
condition:
  variable: "status"
  operator: "equals"
  value: "approved"

# Check if variable exists
condition:
  variable: "optional_data"
  operator: "exists"

# Check if string contains substring
condition:
  variable: "message"
  operator: "contains"
  value: "error"
```

## Data Sharing

### Shared Context

Define initial context available to all workflows:

```yaml
shared_context:
  project_name: "MyProject"
  version: "1.0"
  environment: "production"
```

### Variable Interpolation

Use `{{variable}}` syntax to reference shared context in workflow configurations:

```yaml
workflows:
  - id: "deploy"
    workflow: "deployment.yaml"
    variables:
      project: "{{project_name}}"
      version: "{{version}}"
      env: "{{environment}}"
```

### Saving Results

Use `save_as` to store workflow results in shared context:

```yaml
workflows:
  - id: "analyze"
    workflow: "analyzer.yaml"
    save_as: "analysis_results"
  
  - id: "report"
    workflow: "reporter.yaml"
    variables:
      data: "{{analysis_results}}"
```

## Error Handling

Configure how the orchestration responds to workflow failures.

### Error Strategies

**fail** (default) - Stop orchestration immediately
```yaml
on_error: "fail"
```

**continue** - Skip failed workflow and continue
```yaml
on_error: "continue"
```

**fallback** - Try a backup workflow
```yaml
on_error: "fallback"
fallback_workflow: "backup-workflow.yaml"
```

### Timeouts

Set maximum execution time for workflows:

```yaml
workflows:
  - id: "long_task"
    workflow: "task.yaml"
    timeout: 600  # 10 minutes
    on_error: "fallback"
    fallback_workflow: "quick-task.yaml"
```

### Example: Resilient Orchestration

```yaml
name: "Resilient Data Processing"
strategy: "sequential"

workflows:
  - id: "fetch_data"
    workflow: "fetch.yaml"
    timeout: 120
    on_error: "fallback"
    fallback_workflow: "fetch-cached.yaml"
    save_as: "data"
  
  - id: "process"
    workflow: "process.yaml"
    variables:
      input: "{{data}}"
    timeout: 300
    on_error: "continue"  # Skip if fails
    save_as: "processed"
  
  - id: "validate"
    workflow: "validate.yaml"
    variables:
      data: "{{processed}}"
    on_error: "fail"  # Must succeed
```

## Result Aggregation

Control how results from multiple workflows are combined.

### Merge Strategy

Combines all results and shared context:

```yaml
result_aggregation: "merge"
```

Output includes all variables from shared context and all `save_as` results:
```json
{
  "project_name": "MyProject",
  "analysis_results": {...},
  "report_data": {...}
}
```

### Last Strategy

Returns only the last workflow's result:

```yaml
result_aggregation: "last"
```

### Custom Strategy

Use an LLM to synthesize results:

```yaml
result_aggregation: "custom"
aggregation_prompt: |
  You have received multiple analysis results. Create a comprehensive
  executive summary that highlights:
  1. Key findings
  2. Common themes
  3. Recommendations
  
  Results:
  {{results}}
  
  Provide a concise, actionable summary.

aggregation_model: "gemma3:4b"
```

## Use Cases

### 1. Research and Writing Pipeline

```yaml
name: "Automated Content Creation"
strategy: "sequential"
shared_context:
  topic: "quantum computing"

workflows:
  - id: "research"
    workflow: "research.yaml"
    save_as: "findings"
  - id: "outline"
    workflow: "outline.yaml"
    variables: {data: "{{findings}}"}
    save_as: "structure"
  - id: "write"
    workflow: "write.yaml"
    variables: {outline: "{{structure}}"}
    save_as: "draft"
  - id: "edit"
    workflow: "edit.yaml"
    variables: {content: "{{draft}}"}
```

### 2. Multi-Perspective Analysis

```yaml
name: "360° Code Review"
strategy: "parallel"

workflows:
  - id: "security"
    workflow: "security-review.yaml"
    save_as: "security_report"
  - id: "performance"
    workflow: "performance-review.yaml"
    save_as: "performance_report"
  - id: "maintainability"
    workflow: "maintainability-review.yaml"
    save_as: "maintainability_report"

result_aggregation: "custom"
aggregation_prompt: "Combine these reviews into one: {{results}}"
```

### 3. Adaptive Processing

```yaml
name: "Smart Document Processor"
strategy: "conditional"

workflows:
  - id: "classify"
    workflow: "classifier.yaml"
    save_as: "doc_type"
  
  - id: "process_pdf"
    workflow: "pdf-processor.yaml"
    depends_on: ["classify"]
    condition:
      variable: "doc_type"
      operator: "equals"
      value: "pdf"
  
  - id: "process_image"
    workflow: "image-processor.yaml"
    depends_on: ["classify"]
    condition:
      variable: "doc_type"
      operator: "equals"
      value: "image"
```

### 4. Quality Assurance Pipeline

```yaml
name: "Multi-Stage QA"
strategy: "sequential"

workflows:
  - id: "unit_tests"
    workflow: "unit-test.yaml"
    save_as: "unit_results"
    
  - id: "integration_tests"
    workflow: "integration-test.yaml"
    depends_on: ["unit_tests"]
    condition:
      variable: "unit_results"
      operator: "contains"
      value: "passed"
    
  - id: "deploy"
    workflow: "deploy.yaml"
    depends_on: ["integration_tests"]
```

## Best Practices

### 1. Design for Modularity
- Keep workflows focused on single responsibilities
- Make workflows reusable across different orchestrations
- Use clear, descriptive workflow IDs

### 2. Handle Errors Gracefully
- Always consider what should happen if a workflow fails
- Use timeouts for workflows that might hang
- Provide fallback workflows for critical steps

### 3. Optimize Execution Strategy
- Use **parallel** for independent tasks to save time
- Use **sequential** when order matters or workflows depend on each other
- Use **conditional** for complex branching logic

### 4. Manage Data Flow
- Use descriptive `save_as` names
- Document what data each workflow expects
- Keep shared context organized and minimal

### 5. Start Simple
- Begin with sequential orchestration
- Test individual workflows before orchestrating
- Add complexity incrementally

### 6. Use Descriptive Names
```yaml
# Good
workflows:
  - id: "fetch_customer_data"
    description: "Retrieves customer information from database"
    
# Avoid
workflows:
  - id: "task1"
```

### 7. Monitor and Trace
- Enable tracing for debugging: `--trace`
- Use log files to review orchestration execution
- Check run directories for workflow outputs

### 8. Test Thoroughly
- Test individual workflows first
- Test with small datasets before scaling
- Validate error handling paths

## Advanced Patterns

### Fan-Out/Fan-In

Process multiple items in parallel, then aggregate:

```yaml
name: "Batch Processing"
strategy: "parallel"

workflows:
  - id: "process_1"
    workflow: "processor.yaml"
    variables: {item: "item1"}
    save_as: "result1"
  
  - id: "process_2"
    workflow: "processor.yaml"
    variables: {item: "item2"}
    save_as: "result2"
  
  - id: "process_3"
    workflow: "processor.yaml"
    variables: {item: "item3"}
    save_as: "result3"

result_aggregation: "merge"
```

### Conditional Branching with Convergence

Different paths that reconverge:

```yaml
strategy: "conditional"

workflows:
  - id: "detect"
    workflow: "detector.yaml"
    save_as: "type"
  
  - id: "path_a"
    workflow: "process-a.yaml"
    depends_on: ["detect"]
    condition:
      variable: "type"
      operator: "equals"
      value: "A"
    save_as: "processed"
  
  - id: "path_b"
    workflow: "process-b.yaml"
    depends_on: ["detect"]
    condition:
      variable: "type"
      operator: "equals"
      value: "B"
    save_as: "processed"
  
  - id: "finalize"
    workflow: "finalizer.yaml"
    depends_on: ["path_a", "path_b"]
    variables:
      data: "{{processed}}"
```

### Retry Pattern

Automatic retry with fallback:

```yaml
workflows:
  - id: "attempt_task"
    workflow: "task.yaml"
    timeout: 60
    on_error: "fallback"
    fallback_workflow: "retry-task.yaml"
    save_as: "result"
```

## Troubleshooting

### Orchestration Won't Start
- Check YAML syntax
- Verify all workflow files exist
- Ensure workflow IDs are unique

### Workflow Times Out
- Increase `timeout` value
- Check if workflow is stuck on input
- Use `--trace` to see where it stops

### Condition Never Met
- Verify variable name is correct
- Check operator and value
- Use `exists` operator to check if variable is set

### Results Not Passing Between Workflows
- Verify `save_as` is specified
- Check variable interpolation syntax `{{variable}}`
- Ensure workflows complete successfully

### Circular Dependencies
- Check `depends_on` relationships
- Use conditional strategy for complex dependencies
- Visualize workflow graph on paper

## Next Steps

- Try the example orchestrations in `examples/`
- Start with simple sequential orchestrations
- Experiment with parallel execution for independent tasks
- Build complex conditional logic as needed
- Share your orchestration patterns with the community!
