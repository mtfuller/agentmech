const path = require('path');
const fs = require('fs');
const os = require('os');

// Test the template interpolation functionality
describe('Generate Command Integration', () => {
  const WorkflowParser = require('../../dist/workflow/parser');
  const { WORKFLOW_TEMPLATES, getTemplateById } = require('../../dist/actions/workflow-templates');

  // Helper function to interpolate template variables
  function interpolateTemplate(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  describe('Template Generation', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentmech-test-'));
    });

    afterEach(() => {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should generate valid workflow from simple-qa template', () => {
      const template = getTemplateById('simple-qa');
      const variables = {
        workflow_name: 'Test Q&A',
        question: 'What is machine learning?'
      };

      const workflowContent = interpolateTemplate(template.template, variables);
      const outputPath = path.join(tempDir, 'test-qa.yaml');
      fs.writeFileSync(outputPath, workflowContent, 'utf8');

      // Validate the generated workflow
      const workflow = WorkflowParser.parseFile({
        filePath: outputPath,
        workflowDir: tempDir,
        visitedFiles: new Set()
      });

      expect(workflow.name).toBe('Test Q&A');
      expect(workflow.startState).toBe('ask_question');
      expect(workflow.states['ask_question']).toBeDefined();
      expect(workflow.states['ask_question'].type).toBe('prompt');
      expect(workflow.states['ask_question'].prompt).toBe('What is machine learning?');
    });

    test('should generate valid workflow from user-input-conversation template', () => {
      const template = getTemplateById('user-input-conversation');
      const variables = {
        workflow_name: 'User Survey',
        input_prompt_1: 'What is your email?',
        input_var_1: 'email',
        input_prompt_2: 'What is your feedback?',
        input_var_2: 'feedback',
        response_prompt: 'Thank you {{email}} for your feedback: {{feedback}}'
      };

      const workflowContent = interpolateTemplate(template.template, variables);
      const outputPath = path.join(tempDir, 'user-survey.yaml');
      fs.writeFileSync(outputPath, workflowContent, 'utf8');

      // Validate the generated workflow
      const workflow = WorkflowParser.parseFile({
        filePath: outputPath,
        workflowDir: tempDir,
        visitedFiles: new Set()
      });

      expect(workflow.name).toBe('User Survey');
      expect(workflow.startState).toBe('get_input_1');
      expect(workflow.states['get_input_1']).toBeDefined();
      expect(workflow.states['get_input_1'].type).toBe('input');
      expect(workflow.states['get_input_1'].prompt).toBe('What is your email?');
      expect(workflow.states['get_input_2']).toBeDefined();
      expect(workflow.states['generate_response']).toBeDefined();
    });

    test('should generate valid workflow from sequential-analysis template', () => {
      const template = getTemplateById('sequential-analysis');
      const variables = {
        workflow_name: 'Data Analysis',
        input_prompt: 'Enter data to analyze',
        step_1_task: 'Extract key metrics',
        step_2_task: 'Identify trends',
        step_3_task: 'Generate insights'
      };

      const workflowContent = interpolateTemplate(template.template, variables);
      const outputPath = path.join(tempDir, 'data-analysis.yaml');
      fs.writeFileSync(outputPath, workflowContent, 'utf8');

      // Validate the generated workflow
      const workflow = WorkflowParser.parseFile({
        filePath: outputPath,
        workflowDir: tempDir,
        visitedFiles: new Set()
      });

      expect(workflow.name).toBe('Data Analysis');
      expect(workflow.startState).toBe('get_input');
      expect(workflow.states['step_1']).toBeDefined();
      expect(workflow.states['step_2']).toBeDefined();
      expect(workflow.states['step_3']).toBeDefined();
      expect(workflow.states['step_1'].prompt).toContain('Extract key metrics');
    });

    test('should generate valid workflow from content-generator template', () => {
      const template = getTemplateById('content-generator');
      const variables = {
        workflow_name: 'Blog Post Creator',
        content_type: 'a blog post',
        theme_prompt: 'What topic for the blog post?',
        generation_instructions: 'Write an engaging blog post'
      };

      const workflowContent = interpolateTemplate(template.template, variables);
      const outputPath = path.join(tempDir, 'blog-creator.yaml');
      fs.writeFileSync(outputPath, workflowContent, 'utf8');

      // Validate the generated workflow
      const workflow = WorkflowParser.parseFile({
        filePath: outputPath,
        workflowDir: tempDir,
        visitedFiles: new Set()
      });

      expect(workflow.name).toBe('Blog Post Creator');
      expect(workflow.states['brainstorm']).toBeDefined();
      expect(workflow.states['create_outline']).toBeDefined();
      expect(workflow.states['generate_content']).toBeDefined();
    });

    test('should generate valid workflow from research-assistant template', () => {
      const template = getTemplateById('research-assistant');
      const variables = {
        workflow_name: 'Market Research',
        research_topic: 'electric vehicles market',
        analysis_focus: 'growth trends and key players'
      };

      const workflowContent = interpolateTemplate(template.template, variables);
      const outputPath = path.join(tempDir, 'market-research.yaml');
      fs.writeFileSync(outputPath, workflowContent, 'utf8');

      // Validate the generated workflow
      const workflow = WorkflowParser.parseFile({
        filePath: outputPath,
        workflowDir: tempDir,
        visitedFiles: new Set()
      });

      expect(workflow.name).toBe('Market Research');
      expect(workflow.states['initial_research']).toBeDefined();
      // Parser converts next_options to nextOptions (camelCase)
      expect(workflow.states['initial_research'].nextOptions).toBeDefined();
      expect(Array.isArray(workflow.states['initial_research'].nextOptions)).toBe(true);
      expect(workflow.states['deep_analysis']).toBeDefined();
      expect(workflow.states['summary']).toBeDefined();
    });

    test('all templates should generate valid workflows', () => {
      WORKFLOW_TEMPLATES.forEach(template => {
        // Create minimal variables for each template
        const variables = {};
        template.questions.forEach(q => {
          variables[q.key] = q.defaultValue || `test-${q.key}`;
        });

        const workflowContent = interpolateTemplate(template.template, variables);
        const outputPath = path.join(tempDir, `${template.id}.yaml`);
        fs.writeFileSync(outputPath, workflowContent, 'utf8');

        // This should not throw
        const workflow = WorkflowParser.parseFile({
          filePath: outputPath,
          workflowDir: tempDir,
          visitedFiles: new Set()
        });

        expect(workflow.name).toBeDefined();
        expect(workflow.startState).toBeDefined();
        expect(workflow.states).toBeDefined();
        expect(Object.keys(workflow.states).length).toBeGreaterThan(0);
      });
    });
  });
});
