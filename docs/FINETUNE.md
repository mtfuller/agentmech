# AgentMech Finetune Command

## Overview

The `agentmech finetune` command provides an autonomous mechanism to iteratively improve workflows through LLM-powered analysis, testing, and modification. It creates a feedback loop that evolves workflows into more robust and effective versions.

## Usage

```bash
agentmech finetune <workflow-file> [options]

Options:
  -u, --ollama-url <url>         Ollama API URL (default: "http://localhost:11434")
  -o, --output <path>            Output file path for the finetuned workflow
  -m, --model <model>            Model to use for analysis (default: "gemma3:4b")
  -i, --max-iterations <number>  Maximum number of iterations (default: "5")
```

## How It Works

### Approach

The finetune command implements an iterative improvement cycle:

```
┌─────────────────────────────────────────────────────────┐
│                   FINETUNE WORKFLOW                     │
└─────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Load         │
    │ Workflow     │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Generate or  │
    │ Load Tests   │
    └──────┬───────┘
           │
           ▼
    ╔══════════════════════════════════╗
    ║      ITERATION LOOP              ║
    ║  (max N iterations)              ║
    ╠══════════════════════════════════╣
    ║                                  ║
    ║  1. Save Iteration Version       ║
    ║     ↓                            ║
    ║  2. Run Workflow                 ║
    ║     ↓                            ║
    ║  3. Run Tests                    ║
    ║     ↓                            ║
    ║  4. Analyze Results with LLM     ║
    ║     ↓                            ║
    ║  5. Generate Suggestions         ║
    ║     ↓                            ║
    ║  6. Apply Improvements           ║
    ║     ↓                            ║
    ║  7. Check if Done                ║
    ║     • All tests pass + no mods   ║
    ║     • Max iterations reached     ║
    ║     • User interrupt (Ctrl+C)    ║
    ║                                  ║
    ╚══════════════════════════════════╝
           │
           ▼
    ┌──────────────┐
    │ Save Final   │
    │ Workflow     │
    └──────────────┘
```

### Iteration Process

Each iteration follows these steps:

1. **Save Iteration Version**: Creates a snapshot `workflow.finetune-iter{N}.yaml`
2. **Run Workflow**: Executes the workflow to check functionality
3. **Run Tests**: Runs test scenarios to validate behavior
4. **Analyze with LLM**: The LLM analyzes workflow structure and test results
5. **Generate Suggestions**: Identifies issues and proposes specific improvements
6. **Apply Improvements**: Modifies the workflow YAML based on suggestions
7. **Check Completion**: Stops if tests pass and no improvements needed

### Test Generation

If no test file exists (`workflow.test.yaml`), the finetune command automatically:

1. Analyzes the workflow structure
2. Generates comprehensive test scenarios using an LLM
3. Saves tests to `workflow.finetune-tests.yaml`
4. Uses these tests for validation in each iteration

### LLM-Powered Analysis

The LLM provides three key capabilities:

1. **Test Generation**: Creates appropriate test scenarios covering main paths and edge cases
2. **Result Analysis**: Examines workflow execution and test results to identify issues
3. **YAML Modification**: Generates improved workflow YAML with better prompts, error handling, and state logic

## Example Session

```bash
$ agentmech finetune examples/simple-greeter.yaml

AgentMech Workflow Finetune

This will iteratively improve your workflow using LLM-powered analysis.

Loading workflow from: /path/to/simple-greeter.yaml
Workflow "Simple Greeter" loaded successfully

Output will be saved to: /path/to/simple-greeter.finetuned.yaml

Using model: gemma3:4b

Found existing test file: /path/to/simple-greeter.test.yaml

Starting finetune process with max 5 iterations

════════════════════════════════════════════════════════════

📊 ITERATION 1/5

────────────────────────────────────────────────────────────

Iteration workflow saved: /path/to/simple-greeter.finetune-iter1.yaml

Running workflow...
  Workflow executed successfully

Running tests...
  All tests passed (1/1)

Analyzing workflow and test results...

📋 Analysis:
The workflow is functional but very basic. The prompt "Say hello" is 
too simple and doesn't provide context or personality. The workflow 
lacks error handling and could benefit from more specific instructions.

💡 Suggestions:
  1. Improve the prompt to be more specific and engaging
  2. Add context about the greeting style or tone
  3. Consider adding error handling states

Applying improvements to workflow...
✅ Modifications applied

────────────────────────────────────────────────────────────

📊 ITERATION 2/5

...

✅ Finetune complete! Final workflow saved to: simple-greeter.finetuned.yaml

📊 Summary:
  Total iterations: 3
  Final test status: PASSED
```

## Output Files

The finetune process creates several files:

- `workflow.finetune-iter{N}.yaml`: Workflow snapshot for each iteration
- `workflow.finetune-tests.yaml`: Auto-generated tests (if no test file exists)
- `workflow.finetuned.yaml`: Final improved workflow (default output)

## Best Practices

1. **Start with Tests**: If possible, create a test file before finetuning
   - Tests guide the improvement process
   - More specific tests lead to better improvements

2. **Use Descriptive Workflows**: Workflows with clear names and descriptions help the LLM understand intent

3. **Review Iterations**: Check the intermediate iteration files to understand how the workflow evolved

4. **Interrupt Safely**: Press Ctrl+C to stop early - progress is saved after each iteration

5. **Choose Appropriate Models**: 
   - Smaller models (gemma3:4b): Faster, less sophisticated improvements
   - Larger models: More nuanced analysis and better modifications

## Limitations

- **Input States**: Workflows with input states skip execution in finetune mode (to enable automation)
- **Complex Workflows**: Very complex workflows may need manual intervention
- **LLM Variability**: Results depend on LLM capabilities and may vary between runs
- **No Rollback**: If an iteration makes things worse, use a previous iteration file

## Integration with Other Commands

The finetune command works well with other AgentMech commands:

```bash
# Generate a workflow
agentmech generate -o my-workflow.yaml

# Finetune it
agentmech finetune my-workflow.yaml

# Test the result
agentmech test my-workflow.finetuned.yaml

# Run it
agentmech run my-workflow.finetuned.yaml
```

## Advanced Usage

### Custom Output Location

```bash
agentmech finetune workflow.yaml -o improved/workflow-v2.yaml
```

### More Iterations

```bash
agentmech finetune workflow.yaml -i 10
```

### Different Analysis Model

```bash
agentmech finetune workflow.yaml -m llama3:70b
```

## Technical Details

### Validation

Each modified workflow is validated to ensure:
- Required fields are present (name, states, start_state)
- State structure is valid
- Modifications don't break the workflow schema

### Error Handling

- Invalid LLM responses are caught and the workflow reverts to previous version
- Parse errors in generated YAML are handled gracefully
- Test failures don't stop the process - they inform the next iteration

### Early Stopping

The process stops early if:
- All tests pass and no improvements are suggested
- User presses Ctrl+C
- Maximum iterations reached

## Future Enhancements

Potential future improvements to the finetune command:

1. **Metrics Tracking**: Track performance metrics across iterations
2. **A/B Testing**: Compare multiple improvement strategies
3. **Regression Prevention**: Ensure new changes don't break previous functionality
4. **Interactive Mode**: Let users approve/reject suggestions
5. **Custom Improvement Goals**: Target specific aspects (performance, clarity, robustness)
6. **Workflow Benchmarking**: Compare against similar workflows

## See Also

- [Test Scenarios Documentation](../README.md#testing)
- [Workflow Format](../README.md#workflow-yaml-format)
- [Generate Command](../README.md#workflow-generation)
