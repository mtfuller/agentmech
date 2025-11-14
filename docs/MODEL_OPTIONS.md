# Model Options Guide

This guide explains how to control model behavior using the `options` parameter in your workflow states.

## Overview

AgentMech passes options directly to the Ollama API, allowing you to fine-tune model behavior for each state or step in your workflow. The most commonly used option is `temperature`, which controls the randomness and creativity of model outputs.

## Using Options in Workflows

You can specify options at three levels (with increasing priority):

1. **Workflow-level default** (future enhancement)
2. **State-level** - Applies to all prompts in that state
3. **Step-level** - Applies only to that specific step (overrides state-level)

### State-Level Options

```yaml
states:
  creative_writing:
    type: "prompt"
    prompt: "Write a creative story about {{topic}}"
    model: "gemma3:4b"
    options:
      temperature: 1.2
      top_p: 0.95
      repeat_penalty: 1.1
    save_as: "story"
    next: "end"
```

### Step-Level Options

```yaml
states:
  multi_step_analysis:
    type: "prompt"
    steps:
      - prompt: "Brainstorm creative ideas about {{topic}}"
        save_as: "ideas"
        options:
          temperature: 1.5
          top_k: 40
      
      - prompt: "Analyze the ideas: {{ideas}}"
        save_as: "analysis"
        options:
          temperature: 0.3
          top_p: 0.9
    next: "end"
```

## Supported Options

### temperature

**Type:** Number (typically 0.0 to 2.0)  
**Default:** Model-dependent (usually ~0.8)  
**Description:** Controls randomness and creativity of outputs.

- **0.0 - 0.3**: Very focused and deterministic. Best for factual tasks, code generation, data extraction.
- **0.4 - 0.7**: Balanced. Good for general Q&A and analysis.
- **0.8 - 1.0**: Default range. Natural conversational responses.
- **1.1 - 1.5**: Creative. Good for brainstorming, creative writing, diverse ideas.
- **1.6 - 2.0+**: Very random. Experimental, may produce incoherent results.

**Example:**
```yaml
options:
  temperature: 0.2  # Deterministic, focused outputs
```

### top_p (Nucleus Sampling)

**Type:** Number (0.0 to 1.0)  
**Default:** Model-dependent (usually 0.9)  
**Description:** Alternative to temperature. Selects from smallest set of tokens whose cumulative probability exceeds `top_p`.

- **0.1 - 0.5**: Very focused, considers only most likely tokens
- **0.8 - 0.95**: Balanced, standard range
- **0.95 - 1.0**: More diverse, considers more token options

**Example:**
```yaml
options:
  top_p: 0.9
```

**Note:** Use either `temperature` OR `top_p`, not both. They're different sampling strategies.

### top_k

**Type:** Integer (positive number)  
**Default:** Model-dependent (usually 40)  
**Description:** Limits sampling to the K most likely next tokens.

- **Lower values (10-20)**: More focused outputs
- **Medium values (40-50)**: Balanced
- **Higher values (80-100)**: More diverse outputs

**Example:**
```yaml
options:
  top_k: 40
```

### num_predict

**Type:** Integer (positive number)  
**Default:** Model-dependent (varies by model)  
**Description:** Maximum number of tokens to generate in the response.

**Example:**
```yaml
options:
  num_predict: 100  # Limit response to ~100 tokens
```

### repeat_penalty

**Type:** Number (typically 1.0 to 2.0)  
**Default:** 1.1  
**Description:** Penalizes repeated tokens to reduce repetition.

- **1.0**: No penalty (may produce repetitive text)
- **1.1 - 1.2**: Standard penalty, good default
- **1.3 - 2.0**: Strong penalty (may produce unnatural text)

**Example:**
```yaml
options:
  repeat_penalty: 1.15
```

### seed

**Type:** Integer  
**Default:** Random  
**Description:** Sets the random seed for reproducible outputs. Using the same seed with the same inputs will produce identical outputs.

**Example:**
```yaml
options:
  seed: 42  # Reproducible results
```

### stop

**Type:** Array of strings  
**Default:** Empty  
**Description:** Stop sequences that will halt generation when encountered.

**Example:**
```yaml
options:
  stop: ["END", "###"]
```

## Practical Examples

### Use Case: Code Generation

For precise, deterministic code:
```yaml
generate_code:
  type: "prompt"
  prompt: "Write a Python function to {{task}}"
  options:
    temperature: 0.1
    top_p: 0.9
  next: "end"
```

### Use Case: Creative Writing

For imaginative, diverse outputs:
```yaml
write_story:
  type: "prompt"
  prompt: "Write a short story about {{theme}}"
  options:
    temperature: 1.3
    top_p: 0.95
    repeat_penalty: 1.1
  next: "end"
```

### Use Case: Structured Data Extraction

For consistent formatting:
```yaml
extract_data:
  type: "prompt"
  prompt: "Extract names and dates from: {{text}}"
  options:
    temperature: 0.0
    num_predict: 200
  next: "end"
```

### Use Case: Reproducible Testing

For consistent test results:
```yaml
test_response:
  type: "prompt"
  prompt: "Answer this question: {{question}}"
  options:
    temperature: 0.7
    seed: 12345
  next: "end"
```

### Use Case: Multi-Temperature Workflow

Different temperatures for different tasks:
```yaml
creative_analysis:
  type: "prompt"
  steps:
    - prompt: "Brainstorm solutions for {{problem}}"
      save_as: "solutions"
      options:
        temperature: 1.4  # High creativity
    
    - prompt: "Evaluate feasibility of: {{solutions}}"
      save_as: "evaluation"
      options:
        temperature: 0.3  # Focused analysis
    
    - prompt: "Choose the best solution from: {{evaluation}}"
      save_as: "decision"
      options:
        temperature: 0.5  # Balanced decision
  next: "end"
```

## Tips and Best Practices

1. **Start with defaults**: Most models work well with default settings. Only adjust if needed.

2. **Temperature vs top_p**: Pick one approach:
   - Use `temperature` for simple creativity control
   - Use `top_p` for more nuanced control over token selection

3. **Combine parameters**: `temperature` and `repeat_penalty` work well together:
   ```yaml
   options:
     temperature: 1.0
     repeat_penalty: 1.15
   ```

4. **Use seed for testing**: Set a fixed seed when developing workflows to get consistent results:
   ```yaml
   options:
     seed: 42
   ```

5. **Experiment with extremes carefully**: Very high temperatures (>1.5) can produce incoherent outputs.

6. **Model-specific behavior**: Different models may respond differently to the same parameters. Test with your specific model.

7. **Task-appropriate settings**:
   - **Factual/Technical**: Low temperature (0.1-0.3)
   - **Conversational**: Medium temperature (0.6-0.9)
   - **Creative**: High temperature (1.0-1.5)

## Complete Example Workflow

See [examples/temperature-demo.yaml](../examples/temperature-demo.yaml) for a complete working example that demonstrates:
- Different temperature values
- Impact on creativity and randomness
- Side-by-side comparisons
- Reproducible results with seed

Run it with:
```bash
agentmech run examples/temperature-demo.yaml
```

## Additional Resources

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Understanding Temperature in LLMs](https://community.openai.com/t/temperature-top-p-and-top-k-for-chatbot-responses/295542)
- [examples/temperature-demo.yaml](../examples/temperature-demo.yaml) - Working example
