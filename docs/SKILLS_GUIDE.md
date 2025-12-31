# Skills Guide

Skills allow you to define reusable knowledge and capabilities that can be associated with specific agent states. This enables you to refine your agent's abilities by providing domain-specific knowledge and guidelines.

## Overview

Skills are markdown files (named `SKILLS.md`) organized in subdirectories. Skills can include frontmatter metadata with a name and description. When a state explicitly references skills, the content is automatically injected into the prompt.

## Configuration

### 1. Define Skills in Your Workflow

Add a `skills` section at the workflow level to specify where your skills are located:

```yaml
name: "Planning Agent"
description: "An agent with planning skills"
type: "agent"
default_model: "gemma3:4b"

start_state: "planning"

# Define skills that can be referenced by states
skills:
  planning_skills:
    directory: "./planner/skills"
```

### 2. Create Skill Directories

Create a directory structure with subdirectories for each skill category. Each subdirectory should contain a `SKILLS.md` file:

```
planner/
└── skills/
    ├── planning/
    │   └── SKILLS.md
    └── analysis/
        └── SKILLS.md
```

### 3. Write Skill Content with Frontmatter

Each `SKILLS.md` file should start with YAML frontmatter containing the skill's name and description, followed by the skill content:

**planning/SKILLS.md:**
```markdown
---
name: planning-skills
description: Skills for breaking down tasks, estimating timelines, and allocating resources for project planning
---

# Planning Skills

## Task Breakdown
Break down complex tasks into smaller, manageable steps. Consider dependencies between steps and prioritize them appropriately.

## Timeline Estimation
Estimate realistic timelines for tasks based on complexity, resources, and potential obstacles. Account for buffer time for unexpected issues.

## Resource Allocation
Identify required resources (people, tools, materials) for each task and allocate them efficiently to maximize productivity.
```

The frontmatter provides metadata about each skill, which can be useful for documentation and understanding what each skill offers.

### 4. Reference Skills in States

You must explicitly reference skills in your states using the format `skill_group.subdirectory`:

```yaml
states:
  planning:
    type: "prompt"
    prompt: |
      You need to create a plan for the following user request:
      {{user_request}}
    skills:
      - planning_skills.planning
      - planning_skills.analysis
    save_as: "plan"
    next: "execution"
```

## How It Works

When a state is executed with skills:

1. **Discovery**: The parser scans the specified directory for subdirectories containing `SKILLS.md` files
2. **Parsing**: Each skill file is parsed to extract frontmatter (name, description) and content
3. **Loading**: Each skill is stored with its metadata (e.g., `planning_skills.planning`)
4. **Injection**: When skills are explicitly specified in a state, the executor prepends the skill content to the prompt with clear formatting

The final prompt sent to the LLM looks like:

```
# Skills

You have access to the following skills. Use them to complete the task:

## Skill: planning-skills

# Planning Skills

## Task Breakdown
Break down complex tasks into smaller, manageable steps...

## Timeline Estimation
Estimate realistic timelines for tasks...

---

You need to create a plan for the following user request:
Build a web application for task management
```

## Use Cases

### 1. Domain Expertise

Provide specialized knowledge for specific domains:

```yaml
skills:
  medical_skills:
    directory: "./medical/skills"
  
states:
  diagnosis:
    type: "prompt"
    prompt: "Analyze the patient symptoms: {{symptoms}}"
    skills:
      - medical_skills.diagnostics
      - medical_skills.treatment_protocols
```

### 2. Coding Standards

Enforce coding standards and best practices:

```yaml
skills:
  coding_standards:
    directory: "./coding/skills"
  
states:
  code_review:
    type: "prompt"
    prompt: "Review this code: {{code}}"
    skills:
      - coding_standards.python_style
      - coding_standards.security
```

### 3. Multiple Skill Groups

Use different skill groups for different states:

```yaml
skills:
  research_skills:
    directory: "./research/skills"
  writing_skills:
    directory: "./writing/skills"

states:
  research:
    type: "prompt"
    prompt: "Research the topic: {{topic}}"
    skills:
      - research_skills.fact_checking
      - research_skills.source_evaluation
    next: "write"
  
  write:
    type: "prompt"
    prompt: "Write an article based on: {{research}}"
    skills:
      - writing_skills.structure
      - writing_skills.style_guide
    next: "end"
```

## Best Practices

1. **Keep Skills Focused**: Each skill file should focus on a specific area of expertise
2. **Use Clear Headers**: Organize skill content with clear markdown headers
3. **Be Specific**: Provide concrete guidelines and examples rather than vague advice
4. **Reuse Skills**: Define skills once and reference them across multiple states
5. **Combine with RAG**: Use skills for guidelines and RAG for dynamic knowledge retrieval

## Complete Example

See `examples/skills-example.yaml` for a complete working example with:
- Skill directory structure
- Multiple skill files
- State-level skill references
- Integration with the agent workflow pattern

## Testing

Run the skills example:

```bash
# Validate the workflow
agentmech validate examples/skills-example.yaml

# Run the workflow (requires Ollama)
agentmech run examples/skills-example.yaml

# Run tests
npm test -- skills
```

## Comparison with RAG

| Feature | Skills | RAG |
|---------|--------|-----|
| Content Type | Static guidelines and knowledge | Dynamic document retrieval |
| When to Use | Best practices, procedures, standards | Large knowledge bases, documentation |
| Updates | Manual (edit SKILLS.md files) | Automatic (scan documents) |
| Context Size | Small (injected directly) | Configurable (top-k chunks) |
| Setup | Simple (markdown files) | Moderate (embeddings, chunking) |

Skills and RAG can be used together - use skills for consistent guidelines and RAG for retrieving relevant information from large document sets.
