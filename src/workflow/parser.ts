import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { McpServerConfig, State, Workflow } from './workflow';
import { WorkflowSpec, StateSpec, MCPServerSpec, RAGSpec } from './spec';
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
   * Parse a workflow YAML file
   * @param filePath - Path to the YAML file
   * @param visitedFiles - Set of already visited files to detect cycles
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

  static parseWorkflowSpec(workflow: WorkflowSpec, context: ParserContext): Workflow {
    WorkflowValidator.validateWorkflowSpec(workflow);

    let states: Record<string, State> = {};
    if (workflow.states) {
      for (const [stateName, stateSpec] of Object.entries(workflow.states)) {
        const parsedStates = this.parseStateSpec(stateName, stateSpec, context);
        states = { ...states, ...parsedStates };
      }
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

    return {
      name: workflow.name,
      description: workflow.description,
      defaultModel: workflow.default_model,
      startState: workflow.start_state,
      states,
      mcpServers,
      rag,
      onError: workflow.on_error
    } as Workflow;
  }

  static parseStateSpec(name: string, spec: StateSpec, context: ParserContext): Record<string, State> {
      const builtStates: Record<string, State> = {};

      // Resolve prompt_file reference
      let prompt = spec.prompt || '';
      if (spec.prompt_file) {
        const promptFilePath = path.resolve(context.workflowDir, spec.prompt_file);
        try {
          prompt = fs.readFileSync(promptFilePath, 'utf8');
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            throw new Error(`Prompt file not found: ${promptFilePath}`);
          }
          throw new Error(`Failed to read prompt file: ${error.message}`);
        }
      }

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
      let rag: RAGConfig | undefined;
      if (spec.rag) {
        rag = {
          directory: spec.rag.directory || '',
          model: spec.rag.model,
          embeddingsFile: spec.rag.embeddings_file,
          chunkSize: spec.rag.chunk_size,
          topK: spec.rag.top_k,
          storageFormat: spec.rag.storage_format === 'msgpack' ? 'msgpack' : 'json',
        } as RAGConfig;
      }

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
        defaultValue: spec.default_value,
        onError: spec.on_error,
        files: spec.files || []
      }

      return builtStates;
  }

  static parseMCPServersSpec(serverSpec: MCPServerSpec, context: ParserContext): McpServerConfig {
    if (serverSpec.type === 'npx') {
      // NPX type: automatic npx invocation with package name
      if (!serverSpec.package) {
        throw new Error(`MCP server with type "npx" must have a "package" field`);
      }

      // Convert to standard format
      const packageArgs = ['-y', serverSpec.package];
      if (serverSpec.args && serverSpec.args.length > 0) {
        packageArgs.push(...serverSpec.args);
      }

      return {
        command: 'npx',
        args: packageArgs,
        env: serverSpec.env || {}
      };
    } else if (serverSpec.type === 'custom-tools') {
      // Custom tools type: automatic path to custom-mcp-server.js
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

      // Convert to standard format
      // The custom-mcp-server.js is expected to be in dist/ from the project root
      // We use the standard location that's consistent with how the tool is distributed
      return {
        command: 'node',
        args: ['dist/custom-mcp-server.js', resolvedToolsDir],
        env: serverSpec.env || {}
      };
    } else {
      // Standard configuration
      return {
        command: serverSpec.command || '',
        args: serverSpec.args || [],
        env: serverSpec.env || {}
      };
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
      };
    }

    return builtRAGConfigs;
  }
}

export = WorkflowParser;
