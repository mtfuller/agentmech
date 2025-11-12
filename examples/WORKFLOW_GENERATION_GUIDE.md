# Workflow Generation Guide

This guide demonstrates how to use the improved workflow generation feature to create custom workflows using AI-powered template selection.

## Overview

The `agentmech generate` command now provides an interactive, guided workflow creation experience:

1. **Describe Your Goal**: Tell AgentMech what you're trying to accomplish
2. **AI Recommendations**: The LLM analyzes your goal and recommends suitable workflow templates
3. **Choose a Template**: Select from 2-3 recommended workflow patterns
4. **Customize**: Answer template-specific questions
5. **Generate**: Get a validated, ready-to-run workflow

## Available Templates

### 1. Simple Q&A
**Best for:** Straightforward questions, information lookup, or simple explanations

**Use cases:**
- Getting AI answers to specific questions
- Quick information retrieval
- Basic AI interactions

**Example goals:**
- "I want to ask questions about machine learning"
- "Get an explanation of quantum computing"
- "Quick AI-powered Q&A"

### 2. User Input Conversation
**Best for:** Interactive workflows that need to gather information from users

**Use cases:**
- Surveys and forms
- User onboarding
- Personalized recommendations
- Interactive assistants

**Example goals:**
- "Collect user feedback and generate a summary"
- "Create a personalized recommendation based on user preferences"
- "Interactive survey with AI-generated responses"

### 3. Sequential Analysis
**Best for:** Complex tasks requiring multiple AI processing steps

**Use cases:**
- Data analysis pipelines
- Multi-stage content processing
- Progressive refinement tasks
- Step-by-step problem solving

**Example goals:**
- "Analyze customer feedback in multiple stages"
- "Process text through extraction, analysis, and summarization"
- "Multi-step data transformation"

### 4. Content Generator
**Best for:** Creative content generation with iterative refinement

**Use cases:**
- Story writing
- Blog post creation
- Marketing content
- Creative brainstorming

**Example goals:**
- "Generate a creative short story"
- "Create blog posts with brainstorming and outlining"
- "Write marketing copy with ideation"

### 5. Research Assistant
**Best for:** Research tasks where AI makes decisions about next steps

**Use cases:**
- Academic research
- Market analysis
- Investigative workflows
- Adaptive research processes

**Example goals:**
- "Research a topic with intelligent decision-making"
- "Investigate market trends with dynamic analysis"
- "Adaptive research workflow"

## Example Session

Here's a complete example of generating a workflow:

```bash
$ agentmech generate

AI Workflow Generator

Let's create a workflow tailored to your needs!

What are you trying to accomplish with this workflow? I want to analyze customer feedback and generate insights

Analyzing your goal and finding the best workflow patterns...

Found matching workflow patterns!

Select a workflow template:

1. Sequential Analysis
   Multi-step workflow with progressive analysis
   Use case: Best for complex tasks that require multiple AI processing steps

2. User Input Conversation
   Collect user input and generate personalized responses
   Use case: Best for interactive workflows that need to gather information

3. Content Generator
   Generate creative content with multiple steps
   Use case: Best for creative workflows like story writing

Select a template (1-3): 1

Selected: Sequential Analysis

Please provide the following information:

What would you like to name this workflow? (default: Sequential Analysis Workflow): 
Customer Feedback Analyzer

What information should the user provide? (default: Enter the text you want to analyze): 
Enter customer feedback text

What should the first analysis step do? (default: Summarize the main points): 
Extract key themes and sentiments

What should the second analysis step do? (default: Identify key themes and topics): 
Categorize feedback by topic

What should the final analysis step do? (default: Provide recommendations based on the analysis): 
Generate actionable insights and recommendations

Generating your workflow...

Workflow generated successfully!
Saved to: customer-feedback-analyzer.yaml

Validating generated workflow...

Workflow is valid!
  Name: Customer Feedback Analyzer
  States: 4
  Start state: get_input

You can now run the workflow with:
  agentmech run customer-feedback-analyzer.yaml
```

## Generated Workflow Example

The above session would generate a workflow like:

```yaml
name: "Customer Feedback Analyzer"
description: "Multi-step sequential analysis workflow"
default_model: "gemma3:4b"
start_state: "get_input"

states:
  get_input:
    type: "input"
    prompt: "Enter customer feedback text"
    save_as: "input_text"
    next: "step_1"
  
  step_1:
    type: "prompt"
    prompt: "Extract key themes and sentiments: {{input_text}}"
    save_as: "analysis_1"
    next: "step_2"
  
  step_2:
    type: "prompt"
    prompt: "Categorize feedback by topic: {{analysis_1}}"
    save_as: "analysis_2"
    next: "step_3"
  
  step_3:
    type: "prompt"
    prompt: "Generate actionable insights and recommendations. Previous analysis: {{analysis_2}}"
    save_as: "final_analysis"
    next: "end"
```

## Tips for Best Results

### Describing Your Goal
- Be specific about what you want to accomplish
- Mention if you need user input, multiple steps, or creative generation
- Include the domain or context (e.g., "customer feedback", "blog writing", "data analysis")

### Choosing a Template
- Consider the complexity of your task
- Think about whether you need user interaction
- Consider if the workflow should make intelligent decisions (use Research Assistant)
- Choose Simple Q&A for straightforward queries

### Customizing Questions
- Use descriptive workflow names
- Write clear, specific prompts
- Use meaningful variable names (lowercase, no spaces)
- Think about how data flows between steps

## Advanced Usage

### Custom Output Path
```bash
agentmech generate -o my-custom-workflow.yaml
```

### Different LLM Model
```bash
agentmech generate -m llama2
```

### Combining with Other Features

After generating a workflow, you can:

1. **Add variables** for reusable values
2. **Include MCP servers** for extended capabilities
3. **Add RAG** for context-aware responses
4. **Create tests** to validate behavior

Example enhancement:
```yaml
# Add to your generated workflow
variables:
  system_prompt: "You are a helpful assistant"

mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
```

## Troubleshooting

**Template recommendations don't match my goal:**
The LLM analyzes your description to recommend templates. If recommendations aren't ideal, you can still select any template from the list. Consider rephrasing your goal description to be more specific.

**Generated workflow has validation errors:**
This is rare but can happen. The error message will indicate what needs to be fixed. Edit the YAML file manually to correct any issues.

**Want to modify a generated workflow:**
Generated workflows are standard YAML files. You can edit them directly to add features, modify prompts, or change the structure.

## Next Steps

After generating a workflow:

1. **Test it**: Run with `agentmech run <workflow.yaml>`
2. **Iterate**: Modify the YAML to refine behavior
3. **Add tests**: Create a test file to validate scenarios
4. **Share**: Commit to your repository or share with your team

For more information:
- [README.md](../README.md) - Full documentation
- [USAGE.md](../docs/USAGE.md) - Detailed usage examples
- [examples/](.) - Sample workflows to learn from
