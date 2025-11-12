import WorkflowParser = require('../workflow/parser');
import OllamaClient = require('../ollama/ollama-client');
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import CliFormatter from '../utils/cli-formatter';
import { WORKFLOW_TEMPLATES, getTemplateById, getTemplateRecommendations, WorkflowTemplate } from './workflow-templates';

const MAX_FILENAME_LENGTH = 50;

interface GenerateOptions {
  ollamaUrl: string;
  output?: string;
  model?: string;
}

/**
 * Interpolate variables in a template string
 */
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Sanitize user input to prevent prompt injection
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/```/g, '') // Remove code fence markers
    .replace(/\n\n+/g, '\n') // Normalize multiple newlines
    .replace(/ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi, '') // Remove common injection patterns
    .trim();
}

export async function generate(options: GenerateOptions) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer);
        });
      });
    };

    try {
      console.log('\n' + CliFormatter.ai('AI Workflow Generator') + '\n');
      console.log(CliFormatter.info('Let\'s create a workflow tailored to your needs!') + '\n');
      
      // Step 1: Ask what the user wants to accomplish
      const userGoal = await askQuestion('What are you trying to accomplish with this workflow? ');
      
      if (!userGoal || userGoal.trim() === '') {
        console.error('\n' + CliFormatter.error('Goal cannot be empty'));
        rl.close();
        process.exit(1);
      }

      console.log('\n' + CliFormatter.loading('Analyzing your goal and finding the best workflow patterns...') + '\n');

      // Step 2: Use LLM to recommend templates
      const client = new OllamaClient(options.ollamaUrl);
      const sanitizedGoal = sanitizeInput(userGoal);
      
      // Create a list of available templates for the LLM
      const templateList = WORKFLOW_TEMPLATES.map((t, idx) => 
        `${idx + 1}. ${t.id}: ${t.name} - ${t.useCase}`
      ).join('\n');

      const recommendationPrompt = `You are an expert at workflow design. Based on the user's goal, recommend the most suitable workflow templates.

Available workflow templates:
${templateList}

--- BEGIN USER GOAL ---
${sanitizedGoal}
--- END USER GOAL ---

Instructions:
1. Analyze the user's goal
2. Select the 2-3 most suitable workflow templates from the list above
3. Respond with ONLY the template IDs separated by commas (e.g., "simple-qa, user-input-conversation")
4. Choose templates that best match the complexity and requirements of the goal

Your response (template IDs only):`;

      const recommendationResponse = await client.generate(options.model || 'gemma3:4b', recommendationPrompt);
      const recommendedIds = getTemplateRecommendations(userGoal, recommendationResponse);
      
      // Step 3: Display recommended templates
      console.log(CliFormatter.success('Found matching workflow patterns!') + '\n');
      console.log(CliFormatter.info('Select a workflow template:') + '\n');
      
      const recommendedTemplates = recommendedIds
        .map(id => getTemplateById(id))
        .filter(t => t !== undefined) as WorkflowTemplate[];
      
      // If no valid recommendations, show all templates
      const templatesToShow = recommendedTemplates.length > 0 ? recommendedTemplates : WORKFLOW_TEMPLATES.slice(0, 3);
      
      templatesToShow.forEach((template, idx) => {
        console.log(CliFormatter.highlight(`${idx + 1}. ${template.name}`));
        console.log(CliFormatter.dim(`   ${template.description}`));
        console.log(CliFormatter.dim(`   Use case: ${template.useCase}`) + '\n');
      });

      // Step 4: Let user select a template
      const selectionInput = await askQuestion(`Select a template (1-${templatesToShow.length}): `);
      const selection = parseInt(selectionInput.trim());
      
      if (isNaN(selection) || selection < 1 || selection > templatesToShow.length) {
        console.error('\n' + CliFormatter.error('Invalid selection'));
        rl.close();
        process.exit(1);
      }

      const selectedTemplate = templatesToShow[selection - 1];
      console.log('\n' + CliFormatter.success(`Selected: ${selectedTemplate.name}`) + '\n');

      // Step 5: Collect template-specific information
      console.log(CliFormatter.info('Please provide the following information:') + '\n');
      const templateVars: Record<string, string> = {};
      
      for (const question of selectedTemplate.questions) {
        const promptText = question.defaultValue 
          ? `${question.prompt} (default: ${question.defaultValue}): `
          : `${question.prompt}: `;
        
        const answer = await askQuestion(promptText);
        templateVars[question.key] = answer.trim() || question.defaultValue || '';
      }

      console.log('\n' + CliFormatter.loading('Generating your workflow...') + '\n');

      // Step 6: Generate workflow from template
      const workflowContent = interpolateTemplate(selectedTemplate.template, templateVars);

      // Determine output path
      let outputPath: string;
      if (options.output) {
        outputPath = path.resolve(options.output);
      } else {
        // Generate filename from workflow name
        const workflowName = templateVars['workflow_name'] || 'generated-workflow';
        let filename = workflowName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, MAX_FILENAME_LENGTH);
        
        if (!filename || filename.length < 3) {
          filename = 'generated-workflow';
        }
        
        outputPath = path.resolve(filename + '.yaml');
      }

      // Save the generated workflow
      fs.writeFileSync(outputPath, workflowContent, 'utf8');

      console.log(CliFormatter.success('Workflow generated successfully!'));
      console.log(CliFormatter.file(`Saved to: ${CliFormatter.path(outputPath)}`) + '\n');

      // Validate the generated workflow
      console.log(CliFormatter.loading('Validating generated workflow...') + '\n');
      try {
        const workflow = WorkflowParser.parseFile({filePath: outputPath, workflowDir: '', visitedFiles: new Set()});
        console.log(CliFormatter.success('Workflow is valid!'));
        console.log(CliFormatter.dim(`  Name: ${CliFormatter.highlight(workflow.name)}`));
        console.log(CliFormatter.dim(`  States: ${CliFormatter.number(Object.keys(workflow.states).length)}`));
        console.log(CliFormatter.dim(`  Start state: ${CliFormatter.highlight(workflow.startState)}`) + '\n');
        
        console.log(CliFormatter.info('You can now run the workflow with:'));
        console.log(CliFormatter.highlight(`  agentmech run ${outputPath}`) + '\n');
      } catch (validationError: any) {
        console.log(CliFormatter.warning('Generated workflow has validation errors:'));
        console.log(CliFormatter.dim(`  ${validationError.message}`) + '\n');
        console.log(CliFormatter.info('You may need to manually edit the workflow file.') + '\n');
      }

      rl.close();
      
    } catch (error: any) {
      console.error('\n' + CliFormatter.error(error.message));
      rl.close();
      process.exit(1);
    }
  }