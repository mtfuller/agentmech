/**
 * Tracer module for observability of AI workflow execution
 * Logs all interactions between model, MCP servers, state changes, etc.
 */

interface TraceEvent {
  timestamp: string;
  type: string;
  details: Record<string, any>;
}

class Tracer {
  private enabled: boolean;
  private events: TraceEvent[];

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
    this.events = [];
  }

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log a workflow event
   * @param type - Type of event
   * @param details - Event details
   */
  trace(type: string, details: Record<string, any> = {}): void {
    if (!this.enabled) {
      return;
    }

    const event: TraceEvent = {
      timestamp: new Date().toISOString(),
      type,
      details
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Log a workflow start event
   * @param workflowName - Name of the workflow
   * @param startState - Starting state
   */
  traceWorkflowStart(workflowName: string, startState: string): void {
    this.trace('workflow_start', {
      workflow: workflowName,
      start_state: startState
    });
  }

  /**
   * Log a workflow completion event
   */
  traceWorkflowComplete(): void {
    this.trace('workflow_complete', {});
  }

  /**
   * Log a state transition
   * @param fromState - Current state name
   * @param toState - Next state name
   * @param stateType - Type of state
   */
  traceStateTransition(fromState: string, toState: string, stateType: string): void {
    this.trace('state_transition', {
      from: fromState,
      to: toState,
      state_type: stateType
    });
  }

  /**
   * Log a state execution start
   * @param stateName - Name of the state
   * @param stateType - Type of state
   */
  traceStateExecutionStart(stateName: string, stateType: string): void {
    this.trace('state_execution_start', {
      state: stateName,
      type: stateType
    });
  }

  /**
   * Log a state execution completion
   * @param stateName - Name of the state
   * @param stateType - Type of state
   */
  traceStateExecutionComplete(stateName: string, stateType: string): void {
    this.trace('state_execution_complete', {
      state: stateName,
      type: stateType
    });
  }

  /**
   * Log an Ollama model interaction
   * @param model - Model name
   * @param prompt - Prompt sent to model
   * @param response - Response from model
   * @param options - Additional options used
   */
  traceModelInteraction(model: string, prompt: string, response: string, options: Record<string, any> = {}): void {
    this.trace('model_interaction', {
      model,
      prompt: this.truncate(prompt, 200),
      response: this.truncate(response, 200),
      prompt_length: prompt.length,
      response_length: response.length,
      options
    });
  }

  /**
   * Log an MCP server registration
   * @param serverName - Name of the server
   * @param command - Command used to start server
   */
  traceMcpServerRegister(serverName: string, command: string): void {
    this.trace('mcp_server_register', {
      server: serverName,
      command
    });
  }

  /**
   * Log an MCP server connection
   * @param serverName - Name of the server
   * @param success - Whether connection was successful
   * @param error - Error message if failed
   */
  traceMcpServerConnect(serverName: string, success: boolean, error?: string): void {
    this.trace('mcp_server_connect', {
      server: serverName,
      success,
      error
    });
  }

  /**
   * Log an MCP server disconnection
   * @param serverName - Name of the server
   */
  traceMcpServerDisconnect(serverName: string): void {
    this.trace('mcp_server_disconnect', {
      server: serverName
    });
  }

  /**
   * Log a context variable update
   * @param variableName - Name of the variable
   * @param value - Value stored (truncated for large values)
   */
  traceContextUpdate(variableName: string, value: any): void {
    this.trace('context_update', {
      variable: variableName,
      value: typeof value === 'string' ? this.truncate(value, 100) : value,
      value_type: typeof value
    });
  }

  /**
   * Log a user choice selection
   * @param stateName - Name of the choice state
   * @param selectedValue - Value selected by user
   */
  traceUserChoice(stateName: string, selectedValue: string): void {
    this.trace('user_choice', {
      state: stateName,
      selected: selectedValue
    });
  }

  /**
   * Log an error
   * @param errorType - Type of error
   * @param message - Error message
   * @param context - Additional context
   */
  traceError(errorType: string, message: string, context: Record<string, any> = {}): void {
    this.trace('error', {
      error_type: errorType,
      message,
      ...context
    });
  }

  /**
   * Log a trace event to console
   * @param event - Event to log
   */
  private logEvent(event: TraceEvent): void {
    const detailsStr = Object.keys(event.details).length > 0 
      ? ' | ' + Object.entries(event.details)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join(', ')
      : '';
    
    console.log(`[TRACE ${event.timestamp}] ${event.type}${detailsStr}`);
  }

  /**
   * Truncate a string for logging
   * @param str - String to truncate
   * @param maxLength - Maximum length
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + '...';
  }

  /**
   * Get all trace events
   * @returns Array of trace events
   */
  getEvents(): TraceEvent[] {
    return [...this.events];
  }

  /**
   * Clear all trace events
   */
  clear(): void {
    this.events = [];
  }
}

export = Tracer;
