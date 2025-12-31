const WorkflowParser = require('../../dist/workflow/parser');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

describe('Workflow Skills', () => {
  let testDir;
  let skillsDir;

  beforeEach(() => {
    // Create test directory structure
    testDir = path.join(__dirname, '../../examples/tmp-test-skills');
    skillsDir = path.join(testDir, 'skills');
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should parse workflow with skills configuration', () => {
    // Create skill subdirectories and SKILLS.md files
    const planningSkillDir = path.join(skillsDir, 'planning');
    const analysisSkillDir = path.join(skillsDir, 'analysis');
    fs.mkdirSync(planningSkillDir, { recursive: true });
    fs.mkdirSync(analysisSkillDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(planningSkillDir, 'SKILLS.md'),
      '# Planning Skills\n\nBreak down complex tasks into manageable steps.'
    );
    
    fs.writeFileSync(
      path.join(analysisSkillDir, 'SKILLS.md'),
      '# Analysis Skills\n\nAnalyze requirements thoroughly.'
    );

    // Create workflow file
    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test Skills',
      start_state: 'test',
      skills: {
        planning_skills: {
          directory: './skills'
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test prompt',
          skills: ['planning_skills.planning', 'planning_skills.analysis'],
          next: 'end'
        }
      }
    }));

    const workflow = WorkflowParser.parseFile({
      workflowDir: '',
      filePath: workflowPath,
      visitedFiles: new Set()
    });

    expect(workflow.skills).toBeDefined();
    expect(workflow.skills['planning_skills.planning']).toContain('Planning Skills');
    expect(workflow.skills['planning_skills.analysis']).toContain('Analysis Skills');
    expect(workflow.states['test'].skills).toEqual([
      'planning_skills.planning',
      'planning_skills.analysis'
    ]);
  });

  test('should handle multiple skills configurations', () => {
    // Create two skill directories
    const planningDir = path.join(testDir, 'planning-skills');
    const analysisDir = path.join(testDir, 'analysis-skills');
    const planningSubdir = path.join(planningDir, 'basic');
    const analysisSubdir = path.join(analysisDir, 'advanced');
    
    fs.mkdirSync(planningSubdir, { recursive: true });
    fs.mkdirSync(analysisSubdir, { recursive: true });
    
    fs.writeFileSync(
      path.join(planningSubdir, 'SKILLS.md'),
      '# Basic Planning'
    );
    
    fs.writeFileSync(
      path.join(analysisSubdir, 'SKILLS.md'),
      '# Advanced Analysis'
    );

    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test Multiple Skills',
      start_state: 'test',
      skills: {
        planning: {
          directory: './planning-skills'
        },
        analysis: {
          directory: './analysis-skills'
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test prompt',
          skills: ['planning.basic', 'analysis.advanced'],
          next: 'end'
        }
      }
    }));

    const workflow = WorkflowParser.parseFile({
      workflowDir: '',
      filePath: workflowPath,
      visitedFiles: new Set()
    });

    expect(workflow.skills['planning.basic']).toContain('Basic Planning');
    expect(workflow.skills['analysis.advanced']).toContain('Advanced Analysis');
  });

  test('should handle workflow steps with skills', () => {
    const skillDir = path.join(skillsDir, 'test');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILLS.md'),
      '# Test Skills'
    );

    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test Workflow Steps',
      skills: {
        test_skills: {
          directory: './skills'
        }
      },
      steps: [
        {
          type: 'prompt',
          prompt: 'Step 1',
          skills: ['test_skills.test']
        }
      ]
    }));

    const workflow = WorkflowParser.parseFile({
      workflowDir: '',
      filePath: workflowPath,
      visitedFiles: new Set()
    });

    expect(workflow.skills['test_skills.test']).toContain('Test Skills');
    expect(workflow.states['step_0'].skills).toEqual(['test_skills.test']);
  });

  test('should throw error if skills directory does not exist', () => {
    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test Missing Skills Dir',
      start_state: 'test',
      skills: {
        missing_skills: {
          directory: './nonexistent'
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test prompt',
          next: 'end'
        }
      }
    }));

    expect(() => {
      WorkflowParser.parseFile({
        workflowDir: '',
        filePath: workflowPath,
        visitedFiles: new Set()
      });
    }).toThrow(/Skills directory not found/);
  });

  test('should throw error if skills config is missing directory', () => {
    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test Invalid Skills',
      start_state: 'test',
      skills: {
        bad_skills: {
          // Missing directory field
        }
      },
      states: {
        test: {
          type: 'prompt',
          prompt: 'Test prompt',
          next: 'end'
        }
      }
    }));

    expect(() => {
      WorkflowParser.parseFile({
        workflowDir: '',
        filePath: workflowPath,
        visitedFiles: new Set()
      });
    }).toThrow(/must have a "directory" property/);
  });

  test('should handle states with steps array and skills', () => {
    const skillDir = path.join(skillsDir, 'multi');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILLS.md'),
      '# Multi-step Skills'
    );

    const workflowPath = path.join(testDir, 'workflow.yaml');
    fs.writeFileSync(workflowPath, yaml.dump({
      name: 'Test State Steps',
      start_state: 'multi',
      skills: {
        step_skills: {
          directory: './skills'
        }
      },
      states: {
        multi: {
          type: 'prompt',
          skills: ['step_skills.multi'],
          steps: [
            {
              prompt: 'Step 1'
            },
            {
              prompt: 'Step 2',
              skills: ['step_skills.multi']
            }
          ],
          next: 'end'
        }
      }
    }));

    const workflow = WorkflowParser.parseFile({
      workflowDir: '',
      filePath: workflowPath,
      visitedFiles: new Set()
    });

    expect(workflow.skills['step_skills.multi']).toContain('Multi-step Skills');
    // First step inherits from state level
    expect(workflow.states['multi'].skills).toEqual(['step_skills.multi']);
    // Second step has its own skills
    expect(workflow.states['multi_step_1'].skills).toEqual(['step_skills.multi']);
  });
});
