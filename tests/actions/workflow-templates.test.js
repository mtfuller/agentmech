const { WORKFLOW_TEMPLATES, getTemplateById, getTemplateRecommendations } = require('../../dist/actions/workflow-templates');

describe('Workflow Templates', () => {
  describe('Template Definitions', () => {
    test('should have at least 3 templates defined', () => {
      expect(WORKFLOW_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    });

    test('all templates should have required fields', () => {
      WORKFLOW_TEMPLATES.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('useCase');
        expect(template).toHaveProperty('template');
        expect(template).toHaveProperty('questions');
        expect(Array.isArray(template.questions)).toBe(true);
      });
    });

    test('all template IDs should be unique', () => {
      const ids = WORKFLOW_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all templates should have valid YAML structure', () => {
      WORKFLOW_TEMPLATES.forEach(template => {
        expect(template.template).toContain('name:');
        expect(template.template).toContain('default_model:');
        expect(template.template).toContain('start_state:');
        expect(template.template).toContain('states:');
      });
    });

    test('all template questions should have required fields', () => {
      WORKFLOW_TEMPLATES.forEach(template => {
        template.questions.forEach(question => {
          expect(question).toHaveProperty('key');
          expect(question).toHaveProperty('prompt');
          expect(typeof question.key).toBe('string');
          expect(typeof question.prompt).toBe('string');
          expect(question.key.length).toBeGreaterThan(0);
          expect(question.prompt.length).toBeGreaterThan(0);
        });
      });
    });

    test('templates should have workflow_name as first question', () => {
      WORKFLOW_TEMPLATES.forEach(template => {
        expect(template.questions.length).toBeGreaterThan(0);
        expect(template.questions[0].key).toBe('workflow_name');
      });
    });
  });

  describe('getTemplateById', () => {
    test('should return template for valid ID', () => {
      const template = getTemplateById('simple-qa');
      expect(template).toBeDefined();
      expect(template.id).toBe('simple-qa');
      expect(template.name).toBe('Simple Q&A');
    });

    test('should return undefined for invalid ID', () => {
      const template = getTemplateById('non-existent-template');
      expect(template).toBeUndefined();
    });

    test('should return correct template for each defined ID', () => {
      WORKFLOW_TEMPLATES.forEach(expectedTemplate => {
        const template = getTemplateById(expectedTemplate.id);
        expect(template).toEqual(expectedTemplate);
      });
    });
  });

  describe('getTemplateRecommendations', () => {
    test('should extract template IDs from LLM response', () => {
      const userGoal = 'I want to ask a question';
      const llmResponse = 'simple-qa, user-input-conversation';
      const recommendations = getTemplateRecommendations(userGoal, llmResponse);
      
      expect(recommendations).toContain('simple-qa');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    test('should return fallback templates when no match found', () => {
      const userGoal = 'I want to do something';
      const llmResponse = 'no matching template ids here';
      const recommendations = getTemplateRecommendations(userGoal, llmResponse);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    test('should limit recommendations to 3 templates', () => {
      const userGoal = 'I want to do everything';
      const llmResponse = WORKFLOW_TEMPLATES.map(t => t.id).join(', ');
      const recommendations = getTemplateRecommendations(userGoal, llmResponse);
      
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    test('should handle case-insensitive template ID matching', () => {
      const userGoal = 'I want to ask a question';
      const llmResponse = 'SIMPLE-QA, USER-INPUT-CONVERSATION';
      const recommendations = getTemplateRecommendations(userGoal, llmResponse);
      
      expect(recommendations).toContain('simple-qa');
    });

    test('should extract IDs even when embedded in sentences', () => {
      const userGoal = 'I want to ask a question';
      const llmResponse = 'I recommend using simple-qa for this task, or possibly user-input-conversation if needed.';
      const recommendations = getTemplateRecommendations(userGoal, llmResponse);
      
      expect(recommendations).toContain('simple-qa');
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Template Content Validation', () => {
    test('simple-qa template should have correct structure', () => {
      const template = getTemplateById('simple-qa');
      expect(template).toBeDefined();
      expect(template.questions.length).toBeGreaterThanOrEqual(2);
      expect(template.template).toContain('ask_question');
    });

    test('user-input-conversation template should collect user input', () => {
      const template = getTemplateById('user-input-conversation');
      expect(template).toBeDefined();
      expect(template.template).toContain('type: "input"');
      expect(template.questions.length).toBeGreaterThanOrEqual(3);
    });

    test('sequential-analysis template should have multiple steps', () => {
      const template = getTemplateById('sequential-analysis');
      expect(template).toBeDefined();
      expect(template.template).toContain('step_1');
      expect(template.template).toContain('step_2');
      expect(template.template).toContain('step_3');
    });

    test('content-generator template should have creative workflow', () => {
      const template = getTemplateById('content-generator');
      expect(template).toBeDefined();
      expect(template.template).toContain('brainstorm');
      expect(template.template).toContain('outline');
      expect(template.template).toContain('generate_content');
    });

    test('research-assistant template should have dynamic routing', () => {
      const template = getTemplateById('research-assistant');
      expect(template).toBeDefined();
      expect(template.template).toContain('next_options');
    });
  });
});
