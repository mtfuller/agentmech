import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { McpServerConfig, State, Workflow, SkillMetadata } from './workflow';
import { WorkflowSpec, StateSpec, StepSpec, MCPServerSpec, RAGSpec, ToolSpec } from './spec';
import { RAGConfig } from '../rag/rag-service';
import { WorkflowValidator } from './validator';

const END_STATE = 'end';

interface ParserContext {
  workflowSpec?: WorkflowSpec;
  workflowDir: string;
  filePath: string;
  visitedFiles: Set<string>;
}

class WorkflowParser {
  /**
   * Read a prompt file from disk
   * @param promptFilePath - Path to the prompt file (relative or absolute)
   * @param workflowDir - Directory containing the workflow file
   * @returns Content of the prompt file
   */
  private static readPromptFile(promptFilePath: string, workflowDir: string): string {
    const resolvedPath = path.resolve(workflowDir, promptFilePath);
    try {
      return fs.readFileSync(resolvedPath, 'utf8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Prompt file not found: ${resolvedPath}`);
      }
      throw new Error(`Failed to read prompt file: ${error.message}`);
    }
  }

  /**
   * Parse variables from workflow spec
   * @param variablesSpec - Variables specification from workflow
   * @param workflowDir - Directory containing the workflow file
   * @returns Parsed variables as key-value pairs
   */
  private static parseVariables(variablesSpec: Record<string, any> | undefined, workflowDir: string): Record<string, string> {
    if (!variablesSpec) {
      return {};
    }

    const variables: Record<string, string> = {};
    
    for (const [varName, varSpec] of Object.entries(variablesSpec)) {
      // Handle simple string values (shorthand)
      if (typeof varSpec === 'string') {
        variables[varName] = varSpec;
        continue;
      }
      
      // Handle object format with value or file
      if (typeof varSpec === 'object' && varSpec !== null) {
        if (varSpec.file) {
          // Load variable value from file
          const resolvedPath = path.resolve(workflowDir, varSpec.file);
          try {
            variables[varName] = fs.readFileSync(resolvedPath, 'utf8');
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              throw new Error(`Variable file not found for "${varName}": ${resolvedPath}`);
            }
            throw new Error(`Failed to read variable file for "${varName}": ${error.message}`);
          }
        } else if (varSpec.value !== undefined) {
          // Use inline value
          variables[varName] = String(varSpec.value);
        } else {
          throw new Error(`Variable "${varName}" must have either "value" or "file" property`);
        }
      } else {
        throw new Error(`Variable "${varName}" must be a string or object with "value" or "file" property`);
      }
    }
    
    return variables;
  }

  /**
   * Parse skills from workflow spec
   * Discovers SKILLS.md files in subdirectories of the specified directory
   * Parses frontmatter to extract name and description
   * @param skillsSpec - Skills specification from workflow
   * @param workflowDir - Directory containing the workflow file
   * @returns Parsed skills as key-value pairs (skill name -> skill metadata)
   */
  private static parseSkills(skillsSpec: Record<string, any> | undefined, workflowDir: string): Record<string, SkillMetadata> {
    if (!skillsSpec) {
      return {};
    }

    const skills: Record<string, SkillMetadata> = {};
    
    for (const [skillName, skillSpec] of Object.entries(skillsSpec)) {
      // Handle object format with directory
      if (typeof skillSpec === 'object' && skillSpec !== null && skillSpec.directory) {
        const skillsDir = path.resolve(workflowDir, skillSpec.directory);
        
        try {
          // Check if directory exists
          if (!fs.existsSync(skillsDir)) {
            throw new Error(`Skills directory not found for "${skillName}": ${skillsDir}`);
          }
          
          // Read all subdirectories in the skills directory
          const subdirs = fs.readdirSync(skillsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          
          // Look for SKILLS.md in each subdirectory
          for (const subdir of subdirs) {
            const skillFilePath = path.join(skillsDir, subdir, 'SKILLS.md');
            
            if (fs.existsSync(skillFilePath)) {
              const skillFileContent = fs.readFileSync(skillFilePath, 'utf8');
              const fullSkillName = `${skillName}.${subdir}`;
              
              // Parse frontmatter if present
              const { metadata, content } = this.parseFrontmatter(skillFileContent);
              
              skills[fullSkillName] = {
                name: metadata.name || fullSkillName,
                description: metadata.description || '',
                content: content
              };
            }
          }
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            throw new Error(`Skills directory not found for "${skillName}": ${skillsDir}`);
          }
          throw new Error(`Failed to load skills for "${skillName}": ${error.message}`);
        }
      } else {
        throw new Error(`Skill "${skillName}" must have a "directory" property`);
      }
    }
    
    return skills;
  }

  /**
   * Parse frontmatter from markdown content
   * @param content - Markdown content with optional YAML frontmatter
   * @returns Object with metadata and content
   */
  private static parseFrontmatter(content: string): { metadata: Record<string, string>, content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        const metadata = yaml.load(match[1]) as Record<string, string>;
        return {
          metadata: metadata || {},
          content: match[2].trim()
        };
      } catch (error: any) {
        // If YAML parsing fails, treat the whole content as body
        return {
          metadata: {},
          content: content
        };
      }
    }
    
    // No frontmatter found
    return {
      metadata: {},
      content: content
    };
  }

  /**
   * Resolve the prompt text for a state (from inline or file)
   * @param spec - State specification
   * @param context - Parser context
   * @returns Resolved prompt text
   */
  private static resolvePrompt(spec: StateSpec, context: ParserContext): string {
    if (spec.prompt_file) {
      return this.readPromptFile(spec.prompt_file, context.workflowDir);
    }
    return spec.prompt || '';
  }

  /**
   * Build a RAG configuration from a state spec
   * @param spec - State specification
   * @returns RAG configuration or undefined
   */
  private static buildRAGConfig(spec: StateSpec): RAGConfig | undefined {
    if (!spec.rag) {
      return undefined;
    }

    return {
      directory: spec.rag.directory || '',
      model: spec.rag.model,
      embeddingsFile: spec.rag.embeddings_file,
      chunkSize: spec.rag.chunk_size,
      topK: spec.rag.top_k,
      storageFormat: spec.rag.storage_format === 'msgpack' ? 'msgpack' : 'json',
    } as RAGConfig;
  }

  /**
   * Parse a workflow YAML file
   * @param context - Parser context containing file path and visited files
   * @returns Parsed workflow object
   */
  static parseFile(context: ParserContext): Workflow {
    try {
      // Resolve to absolute path for cycle detection
      const absolutePath = path.resolve(context.filePath);

      // Check for circular references
      if (context.visitedFiles.has(absolutePath)) {
        throw new Error(`Circular workflow reference detected: ${absolutePath}`);
      }

      // Add current file to visited set
      const newVisitedFiles = new Set(context.visitedFiles);
      newVisitedFiles.add(absolutePath);

      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      const workflowDir = path.dirname(absolutePath);
      const workflowSpec = yaml.load(fileContent) as WorkflowSpec;

      return this.parseWorkflowSpec(workflowSpec, {
        workflowSpec,
        workflowDir,
        filePath: absolutePath,
        visitedFiles: newVisitedFiles
      });

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Workflow file not found: ${context.filePath}`);
      }
      throw new Error(`Failed to parse workflow: ${error.message}`);
    }
  }

  /**
   * Convert simplified tools configuration to mcp_servers format
   * This allows tools and mcp_servers to coexist during transition
   * @param workflow - Workflow specification to normalize
   */
  private static normalizeToolsToMcpServers(workflow: WorkflowSpec): void {
    if (!workflow.tools) {
      return;
    }

    // Initialize mcp_servers if not already present
    if (!workflow.mcp_servers) {
      workflow.mcp_servers = {};
    }

    // Convert each tool to an MCP server configuration
    for (const [toolName, toolSpec] of Object.entries(workflow.tools)) {
      // Skip if the tool name already exists in mcp_servers (mcp_servers takes precedence)
      if (workflow.mcp_servers[toolName]) {
        continue;
      }

      const mcpServerSpec: MCPServerSpec = {
        args: toolSpec.args,
        env: toolSpec.env
      };

      if (toolSpec.npm_package) {
        // Convert npm_package to npx type configuration
        mcpServerSpec.type = 'npx';
        mcpServerSpec.package = toolSpec.npm_package;
      } else if (toolSpec.file_path) {
        // Convert file_path to custom-tools type configuration
        mcpServerSpec.type = 'custom-tools';
        mcpServerSpec.tools_directory = toolSpec.file_path;
      } else {
        throw new Error(`Tool "${toolName}" must have either "npm_package" or "file_path" field`);
      }

      workflow.mcp_servers[toolName] = mcpServerSpec;
    }
  }

  static parseWorkflowSpec(workflow: WorkflowSpec, context: ParserContext): Workflow {
    // Convert tools to mcp_servers for backward compatibility
    this.normalizeToolsToMcpServers(workflow);
    
    WorkflowValidator.validateWorkflowSpec(workflow);

    let states: Record<string, State> = {};
    let startState: string = '';

    // Handle workflow with steps (convert to states internally)
    if (workflow.steps) {
      // Convert workflow steps to states
      const convertedStates = this.convertWorkflowStepsToStates(workflow.steps, context);
      states = convertedStates.states;
      startState = convertedStates.startState;
    } 
    // Handle agent with states
    else if (workflow.states) {
      for (const [stateName, stateSpec] of Object.entries(workflow.states)) {
        const parsedStates = this.parseStateSpec(stateName, stateSpec, context);
        states = { ...states, ...parsedStates };
      }
      startState = workflow.start_state!;
    }

    let mcpServers: Record<string, McpServerConfig> = {};
    if (workflow.mcp_servers) {
      for (const [serverName, serverSpec] of Object.entries(workflow.mcp_servers)) {
        mcpServers[serverName] = this.parseMCPServersSpec(serverSpec, context);
      }
    }

    let rag: Record<string, RAGConfig> = {};
    if (workflow.rag) {
      rag = this.parseRAGSpec(workflow.rag);
    }

    let variables: Record<string, string> = {};
    if (workflow.variables) {
      variables = this.parseVariables(workflow.variables, context.workflowDir);
    }

    let skills: Record<string, SkillMetadata> = {};
    if (workflow.skills) {
      skills = this.parseSkills(workflow.skills, context.workflowDir);
    }

    return {
      name: workflow.name,
      description: workflow.description,
      type: workflow.type,  // Optional field - undefined when not specified
      defaultModel: workflow.default_model,
      startState: startState,
      states,
      mcpServers,
      rag,
      skills,
      variables,
      onError: workflow.on_error
    } as Workflow;
  }

  /**
   * Convert workflow steps array to states for internal execution
   * @param steps - Array of workflow steps
   * @param context - Parser context
   * @returns Object with states and startState
   */
  private static convertWorkflowStepsToStates(steps: any[], context: ParserContext): { states: Record<string, State>, startState: string } {
    const states: Record<string, State> = {};
    const startState = 'step_0';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stateName = `step_${i}`;
      
      // Determine next state based on conditional branching
      let nextState: string | undefined;
      let nextOptions: any[] | undefined;

      if (step.next_step_options) {
        // LLM-driven conditional branching
        nextOptions = step.next_step_options.map((option: any) => ({
          state: `step_${option.step}`,
          description: option.description
        }));
      } else if (step.next_step !== undefined) {
        // Direct conditional jump
        nextState = `step_${step.next_step}`;
      } else {
        // Default: proceed to next step sequentially
        nextState = i < steps.length - 1 ? `step_${i + 1}` : 'end';
      }

      // Resolve prompt for this step
      const stepPrompt = step.prompt_file 
        ? this.readPromptFile(step.prompt_file, context.workflowDir)
        : (step.prompt || '');

      // Build RAG config for this step if present
      const stepRag = step.rag ? this.buildRAGConfig({ ...step, rag: step.rag } as any) : undefined;

      states[stateName] = {
        type: step.type,
        prompt: stepPrompt,
        next: nextState,
        ...(nextOptions && { nextOptions }),
        model: step.model,
        saveAs: step.save_as,
        options: step.options,
        mcpServers: step.mcp_servers,
        useRag: step.use_rag,
        rag: stepRag,
        skills: step.skills,
        defaultValue: step.default_value,
        files: step.files || []
      };
    }

    return { states, startState };
  }

  /**
   * Expand a state with steps into multiple sequential states
   * @param name - State name
   * @param spec - State specification with steps
   * @param context - Parser context
   * @returns Record of expanded states
   */
  private static expandStepsToStates(name: string, spec: StateSpec, context: ParserContext): Record<string, State> {
    const builtStates: Record<string, State> = {};
    
    if (!spec.steps || spec.steps.length === 0) {
      throw new Error(`State "${name}" has invalid steps configuration`);
    }
    
    // Build RAG config if present at state level (will be inherited by steps)
    const stateRag = this.buildRAGConfig(spec);
    
    // Process each step
    for (let i = 0; i < spec.steps.length; i++) {
      const step = spec.steps[i];
      const isFirstStep = i === 0;
      const isLastStep = i === spec.steps.length - 1;
      
      // Determine state name: first step uses the original name, others get suffixed
      const stepStateName = isFirstStep ? name : `${name}_step_${i}`;
      
      // Determine next state: last step goes to the state's next, others go to the next step
      let nextState: string | undefined;
      if (isLastStep) {
        nextState = spec.next;
      } else {
        nextState = `${name}_step_${i + 1}`;
      }
      
      // Resolve prompt for this step
      const stepPrompt = step.prompt_file 
        ? this.readPromptFile(step.prompt_file, context.workflowDir)
        : (step.prompt || '');
      
      // Build RAG config for this step (step-level overrides state-level)
      const stepRag = step.rag ? this.buildRAGConfig({ ...spec, rag: step.rag }) : stateRag;
      
      // Create the state for this step
      builtStates[stepStateName] = {
        type: spec.type,
        prompt: stepPrompt,
        next: nextState,
        // Step-level properties override state-level properties
        model: step.model || spec.model,
        saveAs: step.save_as,
        options: step.options || spec.options,
        mcpServers: step.mcp_servers || spec.mcp_servers,
        useRag: step.use_rag || spec.use_rag,
        rag: stepRag,
        skills: step.skills || spec.skills,
        defaultValue: step.default_value || spec.default_value,
        onError: spec.on_error,  // onError is inherited from state level
        files: step.files || spec.files || []
      };
    }
    
    return builtStates;
  }

  static parseStateSpec(name: string, spec: StateSpec, context: ParserContext): Record<string, State> {
      const builtStates: Record<string, State> = {};

      // Handle steps expansion first
      if (spec.steps && spec.steps.length > 0) {
        return this.expandStepsToStates(name, spec, context);
      }

      // Resolve prompt text from inline or file
      const prompt = this.resolvePrompt(spec, context);

      if (spec.workflow_ref) {
        const referencedWorkflowPath = path.resolve(context.workflowDir, spec.workflow_ref);
        try {
          const referencedWorkflow = this.parseFile({
            filePath: referencedWorkflowPath,
            visitedFiles: context.visitedFiles,
            workflowDir: ''
          });

          // Import all states from the referenced workflow
          const statePrefix = name + '_ref_';
          for (const [refStateName, refState] of Object.entries(referencedWorkflow.states)) {
            const newStateName = statePrefix + refStateName;
            builtStates[newStateName] = { ...refState };

            // Update next references to point to prefixed states
            if (builtStates[newStateName].next && builtStates[newStateName].next !== END_STATE) {
              builtStates[newStateName].next = statePrefix + builtStates[newStateName].next;
            }

            // Update nextOptions references to point to prefixed states
            if (builtStates[newStateName].nextOptions) {
              builtStates[newStateName].nextOptions = builtStates[newStateName].nextOptions!.map(option => ({
                ...option,
                state: option.state === END_STATE ? END_STATE : statePrefix + option.state
              }));
            }

            // Update onError references to point to prefixed states
            if (builtStates[newStateName].onError && builtStates[newStateName].onError !== END_STATE) {
              builtStates[newStateName].onError = statePrefix + builtStates[newStateName].onError;
            }
          }

          // Replace the workflow_ref state with a transition to the referenced workflow's start state
          const referencedStartState = statePrefix + referencedWorkflow.startState;

          // Add the transition state
          builtStates[name] = {
            type: 'transition',
            prompt: '',
            next: referencedStartState,
            files: []
          };

          if (!context.workflowSpec) {
            throw new Error(`Workflow reference "${name}" cannot be resolved because the parent workflow spec is not available in context`);
          }

          // Also copy over defaultModel, mcpServers, and RAG configs if not already present
          if (referencedWorkflow.defaultModel && !context.workflowSpec.default_model) {
            context.workflowSpec.default_model = referencedWorkflow.defaultModel;
          }

          if (referencedWorkflow.mcpServers) {
            context.workflowSpec.mcp_servers = context.workflowSpec.mcp_servers || {};
            for (const [serverName, config] of Object.entries(referencedWorkflow.mcpServers)) {
              if (!context.workflowSpec.mcp_servers[serverName]) {
                context.workflowSpec.mcp_servers[serverName] = config;
              }
            }
          }

          if (referencedWorkflow.rag) {
            context.workflowSpec.rag = context.workflowSpec.rag || {};
            for (const [ragName, config] of Object.entries(referencedWorkflow.rag)) {
              if (!context.workflowSpec.rag[ragName]) {
                context.workflowSpec.rag[ragName] = config;
              }
            }
          }
        } catch (error: any) {
          throw new Error(`Failed to load referenced workflow for state "${name}": ${error.message}`);
        }
      }

      // Build RAG config if present
      const rag = this.buildRAGConfig(spec);

      builtStates[name] = {
        type: spec.type,
        prompt: prompt,
        workflowRef: spec.workflow_ref,
        next: spec.next,
        nextOptions: spec.next_options,
        model: spec.model,
        saveAs: spec.save_as,
        options: spec.options,
        mcpServers: spec.mcp_servers,
        useRag: spec.use_rag,
        rag,
        skills: spec.skills,
        defaultValue: spec.default_value,
        onError: spec.on_error,
        files: spec.files || []
      }

      return builtStates;
  }

  /**
   * Parse NPX-type MCP server configuration
   * @param serverSpec - Server specification
   * @returns Standard MCP server configuration
   */
  private static parseNpxServer(serverSpec: MCPServerSpec): McpServerConfig {
    if (!serverSpec.package) {
      throw new Error(`MCP server with type "npx" must have a "package" field`);
    }

    const packageArgs = ['-y', serverSpec.package];
    if (serverSpec.args && serverSpec.args.length > 0) {
      packageArgs.push(...serverSpec.args);
    }

    return {
      command: 'npx',
      args: packageArgs,
      env: serverSpec.env || {}
    };
  }

  /**
   * Parse custom-tools-type MCP server configuration
   * @param serverSpec - Server specification
   * @param context - Parser context
   * @returns Standard MCP server configuration
   */
  private static parseCustomToolsServer(serverSpec: MCPServerSpec, context: ParserContext): McpServerConfig {
    if (!serverSpec.tools_directory) {
      throw new Error(`MCP server with type "custom-tools" must have a "tools_directory" field`);
    }

    // Resolve tools directory relative to workflow file
    const resolvedToolsDir = path.resolve(context.workflowDir, serverSpec.tools_directory);

    // Basic validation to prevent obvious path traversal attempts
    // Note: This is a basic check. The OS-level permissions and spawn() security
    // provide the actual security boundary.
    const normalizedPath = path.normalize(resolvedToolsDir);
    if (normalizedPath.includes('..') && !path.isAbsolute(serverSpec.tools_directory)) {
      console.warn(`Warning: MCP server uses relative path with '..' which may traverse directories: ${serverSpec.tools_directory}`);
    }

    // The custom-mcp-server.js is expected to be in dist/ from the project root
    return {
      command: 'node',
      args: ['dist/custom-mcp-server.js', resolvedToolsDir],
      env: serverSpec.env || {}
    };
  }

  /**
   * Parse standard MCP server configuration
   * @param serverSpec - Server specification
   * @returns Standard MCP server configuration
   */
  private static parseStandardServer(serverSpec: MCPServerSpec): McpServerConfig {
    return {
      command: serverSpec.command || '',
      args: serverSpec.args || [],
      env: serverSpec.env || {}
    };
  }

  /**
   * Parse MCP server specification and convert to standard configuration
   * @param serverSpec - Server specification
   * @param context - Parser context
   * @returns Standard MCP server configuration
   */
  static parseMCPServersSpec(serverSpec: MCPServerSpec, context: ParserContext): McpServerConfig {
    if (serverSpec.type === 'npx') {
      return this.parseNpxServer(serverSpec);
    } else if (serverSpec.type === 'custom-tools') {
      return this.parseCustomToolsServer(serverSpec, context);
    } else {
      return this.parseStandardServer(serverSpec);
    }
  }

  static parseRAGSpec(rag: Record<string, RAGSpec> | undefined) {
    if (!rag) {
      return {};
    }

    const builtRAGConfigs: Record<string, RAGConfig> = {};
    for (const [serviceName, serviceSpec] of Object.entries(rag)) {
      builtRAGConfigs[serviceName] = {
        directory: serviceSpec.directory || '',
        model: serviceSpec.model || '',
        embeddingsFile: serviceSpec.embeddings_file || '',
        chunkSize: serviceSpec.chunk_size || 0,
        topK: serviceSpec.top_k || 0,
        storageFormat: serviceSpec.storage_format === 'msgpack' ? 'msgpack' : 'json',
        contextTemplate: serviceSpec.context_template,
        chunkTemplate: serviceSpec.chunk_template,
      };
    }

    return builtRAGConfigs;
  }
}

export = WorkflowParser;
