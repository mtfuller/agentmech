const WorkflowParser = require('../../dist/workflow/parser');
const WorkflowExecutor = require('../../dist/workflow/executor');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Skills Integration', () => {
  let testDir;
  let skillsDir;

  beforeEach(() => {
    // Create test directory structure
    testDir = path.join(__dirname, '../../examples/tmp-test-skills-integration');
    skillsDir = path.join(testDir, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should include skills in prompt when state has skills configured', () => {
    // Create skill directory and file
    const planningSkillDir = path.join(skillsDir, 'planning');
    fs.mkdirSync(planningSkillDir, { recursive: true });
    
    const skillContent = '# Planning Skills\n\nBreak down complex tasks into manageable steps.';
    fs.writeFileSync(
      path.join(planningSkillDir, 'SKILLS.md'),
      skillContent
    );

    // Create workflow file
    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test Skills Integration',
      start_state: 'test',
      skills: {
        planning_skills: {
          directory: './skills'
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Create a plan',
          skills: ['planning_skills.planning'],
          next: 'end'
        }
      }
    }));

    // Parse workflow
    const workflow = WorkflowParser.parseFile({
      workflowDir: '',
      filePath: workflowPath,
      visitedFiles: new Set()
    });

    // Verify workflow has skills
    expect(workflow.skills).toBeDefined();
    expect(workflow.skills['planning_skills.planning']).toContain('Planning Skills');
    
    // Verify state has skills configured
    expect(workflow.states['test'].skills).toEqual(['planning_skills.planning']);
    
    // Create executor instance (without actually running it)
    const executor = new WorkflowExecutor(workflow);
    
    // Access the private method for testing via prototype
    const preparePromptWithSkills = WorkflowExecutor.prototype.preparePromptWithSkills || 
      function() { throw new Error('Method not accessible'); };
    
    // Test prompt preparation (if method is accessible)
    if (typeof preparePromptWithSkills === 'function') {
      const state = workflow.states['test'];
      const originalPrompt = 'Create a plan';
      const preparedPrompt = preparePromptWithSkills.call(executor, originalPrompt, state);
      
      // Verify skills are injected into prompt
      expect(preparedPrompt).toContain('# Skills');
      expect(preparedPrompt).toContain('planning_skills.planning');
      expect(preparedPrompt).toContain(skillContent);
      expect(preparedPrompt).toContain(originalPrompt);
    }
  });

  test('workflow with skills should have correct structure', () => {
    // Create multiple skill directories
    const planningDir = path.join(skillsDir, 'planning');
    const analysisDir = path.join(skillsDir, 'analysis');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.mkdirSync(analysisDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(planningDir, 'SKILLS.md'),
      '# Planning\n\nPlanning skills content'
    );
    
    fs.writeFileSync(
      path.join(analysisDir, 'SKILLS.md'),
      '# Analysis\n\nAnalysis skills content'
    );

    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Multi-Skills Test',
      start_state: 'planning',
      skills: {
        project_skills: {
          directory: './skills'
        }
      },
      states: {
        planning: {
          type: 'prompt',
          prompt: 'Plan the project',
          skills: ['project_skills.planning', 'project_skills.analysis'],
          next: 'end'
        }
      }
    }));

    const workflow = WorkflowParser.parseFile({
      workflowDir: '',
      filePath: workflowPath,
      visitedFiles: new Set()
    });

    // Verify both skills are loaded
    expect(Object.keys(workflow.skills)).toHaveLength(2);
    expect(workflow.skills['project_skills.planning']).toContain('Planning skills content');
    expect(workflow.skills['project_skills.analysis']).toContain('Analysis skills content');
    
    // Verify state references both skills
    expect(workflow.states['planning'].skills).toEqual([
      'project_skills.planning',
      'project_skills.analysis'
    ]);
  });
});
