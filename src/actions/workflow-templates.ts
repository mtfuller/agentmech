/**
 * Workflow template definitions for guided workflow generation
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  useCase: string;
  template: string;
  questions: Array<{
    key: string;
    prompt: string;
    defaultValue?: string;
  }>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-qa',
    name: 'Simple Q&A',
    description: 'Ask a single question and get an AI-generated answer',
    useCase: 'Best for straightforward questions, information lookup, or simple explanations',
    questions: [
      {
        key: 'workflow_name',
        prompt: 'What would you like to name this workflow?',
        defaultValue: 'Q&A Workflow'
      },
      {
        key: 'question',
        prompt: 'What question should the workflow ask?',
        defaultValue: 'What is artificial intelligence?'
      }
    ],
    template: `name: "{{workflow_name}}"
description: "Simple Q&A workflow"
default_model: "gemma3:4b"
start_state: "ask_question"

states:
  ask_question:
    type: "prompt"
    prompt: "{{question}}"
    save_as: "answer"
    next: "end"
`
  },
  {
    id: 'user-input-conversation',
    name: 'User Input Conversation',
    description: 'Collect user input and generate personalized responses',
    useCase: 'Best for interactive workflows that need to gather information from users before generating responses',
    questions: [
      {
        key: 'workflow_name',
        prompt: 'What would you like to name this workflow?',
        defaultValue: 'User Conversation Workflow'
      },
      {
        key: 'input_prompt_1',
        prompt: 'What is the first question to ask the user?',
        defaultValue: 'What is your name?'
      },
      {
        key: 'input_var_1',
        prompt: 'Variable name for the first input (lowercase, no spaces):',
        defaultValue: 'user_name'
      },
      {
        key: 'input_prompt_2',
        prompt: 'What is the second question to ask the user?',
        defaultValue: 'What topic are you interested in?'
      },
      {
        key: 'input_var_2',
        prompt: 'Variable name for the second input (lowercase, no spaces):',
        defaultValue: 'topic'
      },
      {
        key: 'response_prompt',
        prompt: 'What should the AI do with the collected information?',
        defaultValue: 'Write a brief explanation about {{topic}} for {{user_name}}'
      }
    ],
    template: `name: "{{workflow_name}}"
description: "Interactive workflow that collects user input"
default_model: "gemma3:4b"
start_state: "get_input_1"

states:
  get_input_1:
    type: "input"
    prompt: "{{input_prompt_1}}"
    save_as: "{{input_var_1}}"
    next: "get_input_2"
  
  get_input_2:
    type: "input"
    prompt: "{{input_prompt_2}}"
    save_as: "{{input_var_2}}"
    next: "generate_response"
  
  generate_response:
    type: "prompt"
    prompt: "{{response_prompt}}"
    save_as: "response"
    next: "end"
`
  },
  {
    id: 'sequential-analysis',
    name: 'Sequential Analysis',
    description: 'Multi-step workflow with progressive analysis',
    useCase: 'Best for complex tasks that require multiple AI processing steps, where each step builds on the previous one',
    questions: [
      {
        key: 'workflow_name',
        prompt: 'What would you like to name this workflow?',
        defaultValue: 'Sequential Analysis Workflow'
      },
      {
        key: 'input_prompt',
        prompt: 'What information should the user provide?',
        defaultValue: 'Enter the text you want to analyze'
      },
      {
        key: 'step_1_task',
        prompt: 'What should the first analysis step do?',
        defaultValue: 'Summarize the main points'
      },
      {
        key: 'step_2_task',
        prompt: 'What should the second analysis step do?',
        defaultValue: 'Identify key themes and topics'
      },
      {
        key: 'step_3_task',
        prompt: 'What should the final analysis step do?',
        defaultValue: 'Provide recommendations based on the analysis'
      }
    ],
    template: `name: "{{workflow_name}}"
description: "Multi-step sequential analysis workflow"
default_model: "gemma3:4b"
start_state: "get_input"

states:
  get_input:
    type: "input"
    prompt: "{{input_prompt}}"
    save_as: "input_text"
    next: "step_1"
  
  step_1:
    type: "prompt"
    prompt: "{{step_1_task}}: {{input_text}}"
    save_as: "analysis_1"
    next: "step_2"
  
  step_2:
    type: "prompt"
    prompt: "{{step_2_task}}: {{analysis_1}}"
    save_as: "analysis_2"
    next: "step_3"
  
  step_3:
    type: "prompt"
    prompt: "{{step_3_task}}. Previous analysis: {{analysis_2}}"
    save_as: "final_analysis"
    next: "end"
`
  },
  {
    id: 'content-generator',
    name: 'Content Generator',
    description: 'Generate creative content with multiple steps',
    useCase: 'Best for creative workflows like story writing, character creation, or content generation with iterative refinement',
    questions: [
      {
        key: 'workflow_name',
        prompt: 'What would you like to name this workflow?',
        defaultValue: 'Content Generator Workflow'
      },
      {
        key: 'content_type',
        prompt: 'What type of content should be generated?',
        defaultValue: 'a short story'
      },
      {
        key: 'theme_prompt',
        prompt: 'What should the user specify about the content?',
        defaultValue: 'What theme or topic should the story be about?'
      },
      {
        key: 'generation_instructions',
        prompt: 'What specific instructions for content generation?',
        defaultValue: 'Write a creative and engaging story with a beginning, middle, and end'
      }
    ],
    template: `name: "{{workflow_name}}"
description: "Creative content generation workflow"
default_model: "gemma3:4b"
start_state: "get_theme"

states:
  get_theme:
    type: "input"
    prompt: "{{theme_prompt}}"
    save_as: "theme"
    next: "brainstorm"
  
  brainstorm:
    type: "prompt"
    prompt: "Generate 3 creative ideas for {{content_type}} about: {{theme}}"
    save_as: "ideas"
    next: "create_outline"
  
  create_outline:
    type: "prompt"
    prompt: "Based on these ideas: {{ideas}}, create a detailed outline for {{content_type}}"
    save_as: "outline"
    next: "generate_content"
  
  generate_content:
    type: "prompt"
    prompt: "{{generation_instructions}} based on this outline: {{outline}}"
    save_as: "final_content"
    next: "end"
`
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Intelligent research workflow with dynamic routing',
    useCase: 'Best for research tasks where the AI needs to make decisions about next steps based on intermediate results',
    questions: [
      {
        key: 'workflow_name',
        prompt: 'What would you like to name this workflow?',
        defaultValue: 'Research Assistant Workflow'
      },
      {
        key: 'research_topic',
        prompt: 'What research topic or question should be explored?',
        defaultValue: 'artificial intelligence in healthcare'
      },
      {
        key: 'analysis_focus',
        prompt: 'What aspect should the analysis focus on?',
        defaultValue: 'current applications and future potential'
      }
    ],
    template: `name: "{{workflow_name}}"
description: "Intelligent research workflow with LLM-driven routing"
default_model: "gemma3:4b"
start_state: "initial_research"

states:
  initial_research:
    type: "prompt"
    prompt: "Research the topic: {{research_topic}}. Focus on: {{analysis_focus}}"
    save_as: "initial_findings"
    next_options:
      - state: "deep_analysis"
        description: "The findings require deeper analysis"
      - state: "summary"
        description: "The findings are sufficient for a summary"
  
  deep_analysis:
    type: "prompt"
    prompt: "Perform a detailed analysis of these findings: {{initial_findings}}"
    save_as: "detailed_analysis"
    next: "summary"
  
  summary:
    type: "prompt"
    prompt: "Create a comprehensive summary of the research on {{research_topic}}. Findings: {{initial_findings}}. Analysis: {{detailed_analysis}}"
    save_as: "final_report"
    next: "end"
`
  }
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}

/**
 * Get template recommendations based on user goal
 */
export function getTemplateRecommendations(userGoal: string, llmResponse: string): string[] {
  // Parse LLM response to extract template IDs
  // Expected format: template IDs separated by commas or listed
  const recommendations: string[] = [];
  
  for (const template of WORKFLOW_TEMPLATES) {
    if (llmResponse.toLowerCase().includes(template.id)) {
      recommendations.push(template.id);
    }
  }
  
  // If no templates found in response, return first 3 as fallback
  if (recommendations.length === 0) {
    return WORKFLOW_TEMPLATES.slice(0, 3).map(t => t.id);
  }
  
  return recommendations.slice(0, 3); // Return max 3 recommendations
}
