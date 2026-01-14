# AgentMech Finetune Command - Implementation Summary

## Problem Statement

As a user, I would like to have a new command that I can invoke with "agentmech finetune". This will then initiate an LLM-powered flow to create a copy of a specified workflow, run the workflow, test it, modify the workflow YAML, and iterate while providing updates. The goal of this is to provide an autonomous mechanism to evolve a workflow into something that is robust and effective.

## Suggested Approach

The finetune command implements an **iterative improvement cycle** that leverages LLM capabilities for autonomous workflow evolution:

### Architecture

```
Input: Workflow YAML File
         ↓
    ┌────────────────┐
    │  Load & Parse  │
    └────────┬───────┘
             ↓
    ┌────────────────┐
    │ Test Discovery │  ← Generate if missing
    └────────┬───────┘
             ↓
    ╔════════════════════════════════╗
    ║   ITERATION LOOP (N times)     ║
    ╠════════════════════════════════╣
    ║  1. Save Snapshot              ║
    ║  2. Execute Workflow           ║
    ║  3. Run Test Scenarios         ║
    ║  4. LLM Analysis               ║
    ║  5. Generate Suggestions       ║
    ║  6. Apply Modifications        ║
    ║  7. Validate Changes           ║
    ╚════════════════════════════════╝
             ↓
    ┌────────────────┐
    │ Save Final     │
    │ Workflow       │
    └────────────────┘
```

### Key Components

1. **Test Generation** (if needed)
   - Analyzes workflow structure
   - Uses LLM to generate comprehensive test scenarios
   - Covers main paths and edge cases
   - Saves to `.finetune-tests.yaml`

2. **Workflow Execution**
   - Runs the workflow to validate functionality
   - Skips interactive states for automation
   - Captures execution results

3. **Test Execution**
   - Runs all test scenarios
   - Tracks pass/fail status
   - Collects detailed results for analysis

4. **LLM Analysis**
   - Examines workflow structure
   - Reviews test results
   - Identifies issues and weaknesses
   - Generates specific improvement suggestions

5. **YAML Modification**
   - Applies improvements to workflow
   - Validates modified YAML structure
   - Preserves workflow integrity
   - Rejects invalid modifications

6. **Progress Tracking**
   - Saves iteration snapshots
   - Reports analysis and suggestions
   - Shows test pass/fail status
   - Enables early stopping

## Implementation Details

### Command Interface

```bash
agentmech finetune <workflow-file> [options]

Options:
  -u, --ollama-url <url>         Ollama API URL (default: "http://localhost:11434")
  -o, --output <path>            Output file path for the finetuned workflow
  -m, --model <model>            Model to use for analysis (default: "gemma3:4b")
  -i, --max-iterations <number>  Maximum number of iterations (default: "5")
```

### Core Functions

1. **`generateTestScenarios()`**
   - Prompts LLM with workflow YAML
   - Extracts test scenarios from response
   - Falls back to basic tests if generation fails
   - Returns test suite structure

2. **`analyzeAndSuggestImprovements()`**
   - Constructs analysis prompt with workflow + results
   - Parses LLM response for analysis and suggestions
   - Returns structured improvement data
   - Handles malformed responses gracefully

3. **`applyImprovements()`**
   - Sends workflow + suggestions to LLM
   - Extracts modified YAML from response
   - Validates workflow structure
   - Rejects invalid modifications

4. **`finetune()` - Main Entry Point**
   - Orchestrates the entire process
   - Manages iteration loop
   - Handles user interruption (Ctrl+C)
   - Saves intermediate and final results

### Iteration Process

Each iteration follows these steps:

```typescript
for (let i = 1; i <= maxIterations && !stopRequested; i++) {
  // 1. Save iteration snapshot
  saveIterationVersion(workflow, i);
  
  // 2. Execute workflow (if possible)
  const executed = await executeWorkflow(workflow);
  
  // 3. Run tests
  const testResults = await runTests(workflow, testSuite);
  
  // 4. Analyze with LLM
  const { analysis, suggestions } = await analyzeWithLLM(workflow, testResults);
  
  // 5. Display results
  displayAnalysisAndSuggestions(analysis, suggestions);
  
  // 6. Apply improvements (if not last iteration)
  if (i < maxIterations) {
    workflow = await applyImprovements(workflow, suggestions);
  }
  
  // 7. Check for early stopping
  if (testsPassed && !modified) {
    break; // Success!
  }
}
```

### Output Files

The command generates several files:

- `workflow.finetune-iter1.yaml` - Snapshot after iteration 1
- `workflow.finetune-iter2.yaml` - Snapshot after iteration 2
- ... (one per iteration)
- `workflow.finetune-tests.yaml` - Auto-generated tests (if applicable)
- `workflow.finetuned.yaml` - Final improved workflow

### Error Handling

- **Invalid LLM responses**: Caught and workflow reverts to previous version
- **YAML parse errors**: Handled gracefully, modifications rejected
- **Test failures**: Don't stop process, inform next iteration
- **Missing workflows**: Validated before starting
- **Interrupted execution**: Saves state, allows graceful exit

### Safety Features

1. **Validation**: Every modified workflow is validated for required fields
2. **Rollback**: Previous iteration files allow manual rollback
3. **Early Stopping**: Stops when tests pass and no improvements needed
4. **Interrupt Handling**: Ctrl+C saves progress and exits cleanly
5. **Non-destructive**: Original workflow file is never modified

## Usage Examples

### Basic Usage

```bash
# Finetune a simple workflow
agentmech finetune examples/simple-greeter.yaml

# Expected output:
# - Loads workflow
# - Finds or generates tests
# - Runs 5 iterations (default)
# - Saves improved workflow
```

### Custom Configuration

```bash
# Use more iterations and a larger model
agentmech finetune workflow.yaml -i 10 -m llama3:70b -o improved-workflow.yaml
```

### Integration Workflow

```bash
# 1. Generate a workflow
agentmech generate -o my-workflow.yaml

# 2. Finetune it
agentmech finetune my-workflow.yaml

# 3. Test the result
agentmech test my-workflow.finetuned.yaml

# 4. Run it
agentmech run my-workflow.finetuned.yaml
```

## Benefits

1. **Autonomous Improvement**: No manual intervention needed
2. **Test-Driven**: Uses test results to guide improvements
3. **Transparent**: Shows analysis and suggestions for each iteration
4. **Traceable**: Saves iteration snapshots for review
5. **Safe**: Validates all changes, never modifies original
6. **Flexible**: Configurable iterations, models, and output
7. **Integrated**: Works seamlessly with existing AgentMech commands

## Limitations & Future Enhancements

### Current Limitations

- Workflows with input states skip execution (automation constraint)
- LLM quality affects improvement quality
- No rollback mechanism (manual via iteration files)
- No metrics tracking across iterations

### Future Enhancements

1. **Metrics Dashboard**: Track performance improvements over iterations
2. **A/B Testing**: Compare multiple improvement strategies
3. **Interactive Mode**: Approve/reject suggestions manually
4. **Custom Goals**: Target specific aspects (performance, clarity, robustness)
5. **Benchmarking**: Compare against similar workflows
6. **Regression Detection**: Ensure new changes don't break old functionality

## Technical Implementation

### Files Modified/Added

**New Files:**
- `src/actions/finetune.ts` - Main implementation (454 lines)
- `tests/actions/finetune.test.js` - Unit tests (13 tests)
- `docs/FINETUNE.md` - Comprehensive documentation
- `examples/simple-greeter.yaml` - Example workflow
- `examples/simple-greeter.test.yaml` - Example test file

**Modified Files:**
- `src/actions/index.ts` - Export finetune action
- `src/cli.ts` - Add finetune command
- `README.md` - Document new feature

### Testing

- **Unit Tests**: 13 tests covering command structure, YAML processing, file naming
- **Integration**: Compatible with existing test suite (258 tests pass)
- **Code Quality**: No CodeQL security issues
- **Build**: Clean TypeScript compilation

### Dependencies

Uses existing dependencies:
- `js-yaml` - YAML parsing and generation
- `commander` - CLI argument parsing
- `readline` - User interaction
- Existing AgentMech modules (parser, executor, test runner, Ollama client)

## Conclusion

The `agentmech finetune` command provides a robust, autonomous mechanism for workflow evolution. It combines:

- **LLM Intelligence**: For analysis and improvement suggestions
- **Test-Driven Development**: For validation and quality assurance
- **Iterative Refinement**: For continuous improvement
- **Safety & Traceability**: For reliable operations

This implementation successfully addresses the problem statement by providing an LLM-powered flow that autonomously evolves workflows into more robust and effective versions through iterative testing and modification.

## Documentation

For detailed usage and examples, see:
- [docs/FINETUNE.md](docs/FINETUNE.md) - Complete documentation with diagrams
- [README.md](README.md#commands) - Quick reference
- `agentmech finetune --help` - Command-line help
