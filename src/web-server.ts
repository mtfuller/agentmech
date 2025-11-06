import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import WorkflowDiscovery = require('./workflow-discovery');
import WorkflowParser = require('./workflow-parser');
import WorkflowExecutor = require('./workflow-executor');
import WebWorkflowExecutor = require('./web-workflow-executor');

interface ServeOptions {
  port: number;
  workflowDir: string;
  ollamaUrl: string;
}

class WebServer {
  private app: express.Application;
  private options: ServeOptions;
  private server: any;
  private activeExecutions: Map<string, WebWorkflowExecutor>;

  constructor(options: ServeOptions) {
    this.options = options;
    this.app = express();
    this.activeExecutions = new Map();
    
    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Serve static frontend
    this.app.get('/', (req: Request, res: Response) => {
      res.send(this.getIndexHtml());
    });

    // Serve execution page
    this.app.get('/execute/:fileName', (req: Request, res: Response) => {
      res.send(this.getExecutionHtml());
    });

    // API: List all workflows
    this.app.get('/api/workflows', (req: Request, res: Response) => {
      try {
        const workflows = WorkflowDiscovery.discoverWorkflows(this.options.workflowDir);
        res.json({ workflows });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // API: Get workflow details
    this.app.get('/api/workflows/:fileName', (req: Request, res: Response) => {
      try {
        const filePath = path.join(this.options.workflowDir, req.params.fileName);
        
        // Security check: ensure file is within workflow directory
        const resolvedPath = path.resolve(filePath);
        const resolvedDir = path.resolve(this.options.workflowDir);
        if (!resolvedPath.startsWith(resolvedDir)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        const workflow = WorkflowParser.parseFile(filePath);
        res.json(workflow);
      } catch (error: any) {
        res.status(404).json({ error: error.message });
      }
    });

    // API: Start workflow execution with SSE
    this.app.get('/api/workflows/:fileName/execute', (req: Request, res: Response) => {
      const filePath = path.join(this.options.workflowDir, req.params.fileName);
      
      // Security check: ensure file is within workflow directory
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(this.options.workflowDir);
      if (!resolvedPath.startsWith(resolvedDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      try {
        // Parse and create executor
        const workflow = WorkflowParser.parseFile(filePath);
        const sessionId = `${req.params.fileName}-${Date.now()}`;
        const executor = new WebWorkflowExecutor(workflow, this.options.ollamaUrl);
        
        // Store executor
        this.activeExecutions.set(sessionId, executor);
        
        // Set SSE response and send session ID
        // Note: This calls writeHead() which must be done before any other response methods
        // like res.json() or res.setHeader() that would fail after headers are sent
        executor.setSseResponse(res, sessionId);
        
        // Handle client disconnect
        req.on('close', () => {
          this.activeExecutions.delete(sessionId);
        });
        
        // Start execution
        executor.execute().catch((error) => {
          console.error('Workflow execution error:', error);
        }).finally(() => {
          // Clean up
          this.activeExecutions.delete(sessionId);
        });
        
      } catch (error: any) {
        // Only send JSON error if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    });

    // API: Provide input to workflow execution
    this.app.post('/api/workflows/:fileName/input', (req: Request, res: Response) => {
      try {
        const { sessionId, input } = req.body;
        
        if (!sessionId || input === undefined) {
          return res.status(400).json({ error: 'Missing sessionId or input' });
        }
        
        const executor = this.activeExecutions.get(sessionId);
        if (!executor) {
          return res.status(404).json({ error: 'Execution session not found' });
        }
        
        executor.provideInput(input);
        res.json({ success: true });
        
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // API: Stop workflow execution
    this.app.post('/api/workflows/:fileName/stop', (req: Request, res: Response) => {
      try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
          return res.status(400).json({ error: 'Missing sessionId' });
        }
        
        const executor = this.activeExecutions.get(sessionId);
        if (!executor) {
          return res.status(404).json({ error: 'Execution session not found' });
        }
        
        executor.stop();
        res.json({ success: true });
        
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private getIndexHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Workflow CLI - Web UI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        h1 {
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        
        .workflows-container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .workflow-card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }
        
        .workflow-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }
        
        .workflow-card.invalid {
            border-color: #ff6b6b;
            opacity: 0.7;
        }
        
        .workflow-name {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }
        
        .workflow-description {
            color: #666;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        
        .workflow-file {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #999;
            background: #f5f5f5;
            padding: 5px 10px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .workflow-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
        }
        
        .btn-run {
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-run:hover {
            background: #218838;
        }
        
        .btn-details {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.3s ease;
        }
        
        .btn-details:hover {
            background: #5568d3;
        }
        
        .workflow-error {
            color: #ff6b6b;
            font-size: 14px;
            margin-top: 10px;
            padding: 10px;
            background: #fff5f5;
            border-radius: 4px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            background: #fff5f5;
            border: 2px solid #ff6b6b;
            border-radius: 8px;
            padding: 20px;
            color: #ff6b6b;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        
        .badge.valid {
            background: #d4edda;
            color: #155724;
        }
        
        .badge.invalid {
            background: #f8d7da;
            color: #721c24;
        }
        
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
            transition: background 0.3s ease;
        }
        
        .btn:hover {
            background: #5568d3;
        }
        
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: white;
            border-radius: 10px;
            padding: 30px;
            max-width: 900px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        }
        
        .close-btn:hover {
            color: #333;
        }
        
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .info-box {
            background: #e7f3ff;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }
        
        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 AI Workflow CLI</h1>
            <p class="subtitle">Browse and manage your AI workflows</p>
        </header>
        
        <div class="workflows-container">
            <h2 style="margin-bottom: 20px;">Available Workflows</h2>
            <div id="workflows-list" class="loading">Loading workflows...</div>
        </div>
    </div>
    
    <div id="workflow-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title">Workflow Details</h2>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div id="modal-body"></div>
        </div>
    </div>
    
    <script>
        let workflows = [];
        
        async function loadWorkflows() {
            try {
                const response = await fetch('/api/workflows');
                const data = await response.json();
                workflows = data.workflows;
                renderWorkflows();
            } catch (error) {
                document.getElementById('workflows-list').innerHTML = \`
                    <div class="error">
                        <strong>Error loading workflows:</strong><br>
                        \${error.message}
                    </div>
                \`;
            }
        }
        
        function renderWorkflows() {
            const container = document.getElementById('workflows-list');
            
            if (workflows.length === 0) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <div class="empty-state-icon">📂</div>
                        <h3>No workflows found</h3>
                        <p>Place your workflow YAML files in the workflows directory</p>
                    </div>
                \`;
                return;
            }
            
            container.innerHTML = workflows.map(wf => \`
                <div class="workflow-card \${wf.valid ? '' : 'invalid'}">
                    <div class="workflow-name">
                        \${wf.name}
                        <span class="badge \${wf.valid ? 'valid' : 'invalid'}">
                            \${wf.valid ? '✓ Valid' : '✗ Invalid'}
                        </span>
                    </div>
                    \${wf.description ? \`<div class="workflow-description">\${wf.description}</div>\` : ''}
                    <div class="workflow-file">\${wf.fileName}</div>
                    \${wf.error ? \`<div class="workflow-error"><strong>Error:</strong> \${wf.error}</div>\` : ''}
                    \${wf.valid ? \`
                        <div class="workflow-actions">
                            <a href="/execute/\${wf.fileName}" class="btn-run">▶ Run</a>
                            <button class="btn-details" onclick="showWorkflowDetails('\${wf.fileName}')">ℹ Details</button>
                        </div>
                    \` : ''}
                </div>
            \`).join('');
        }
        
        function buildWorkflowGraph(workflow) {
            const states = workflow.states;
            const startState = workflow.start_state;
            
            // Build graph data structure
            const nodes = [];
            const edges = [];
            const stateNames = Object.keys(states);
            
            // Create nodes
            stateNames.forEach((stateName) => {
                const state = states[stateName];
                nodes.push({
                    id: stateName,
                    label: stateName,
                    type: state.type,
                    isStart: stateName === startState
                });
            });
            
            // Create edges
            stateNames.forEach((stateName) => {
                const state = states[stateName];
                
                // Handle simple next transitions
                if (state.next) {
                    edges.push({
                        from: stateName,
                        to: state.next,
                        label: ''
                    });
                }
                
                // Handle choice transitions
                if (state.choices && Array.isArray(state.choices)) {
                    state.choices.forEach((choice, idx) => {
                        if (choice.next) {
                            edges.push({
                                from: stateName,
                                to: choice.next,
                                label: choice.label || choice.value || \`Choice \${idx + 1}\`
                            });
                        }
                    });
                }
                
                // Handle next_options
                if (state.next_options && Array.isArray(state.next_options)) {
                    state.next_options.forEach((option) => {
                        if (option.state) {
                            const desc = option.description ?? '';
                            edges.push({
                                from: stateName,
                                to: option.state,
                                label: desc.length > 20 ? desc.substring(0, 20) + '...' : desc
                            });
                        }
                    });
                }
            });
            
            return { nodes, edges };
        }
        
        function renderWorkflowGraph(workflow, containerId) {
            const { nodes, edges } = buildWorkflowGraph(workflow);
            const container = document.getElementById(containerId);
            
            if (nodes.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999;">No states to visualize</p>';
                return;
            }
            
            // Simple layout algorithm - hierarchical top-to-bottom
            const positions = layoutGraph(nodes, edges, workflow.start_state);
            
            // Calculate SVG dimensions
            const GRAPH_WIDTH = 800;
            const height = Math.max(400, positions.maxY + 100);
            
            // Build SVG
            let svg = \`<svg width="\${GRAPH_WIDTH}" height="\${height}" style="border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">\`;
            
            // Define arrow marker
            svg += \`
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                    </marker>
                </defs>
            \`;
            
            // Draw edges first (so they appear behind nodes)
            edges.forEach(edge => {
                const fromPos = positions.nodes[edge.from];
                const toPos = positions.nodes[edge.to];
                
                if (!fromPos || !toPos) return;
                
                // Calculate connection points (bottom of from node to top of to node)
                const x1 = fromPos.x;
                const y1 = fromPos.y + 30; // bottom of node
                const x2 = toPos.x;
                const y2 = toPos.y - 30; // top of node
                
                // Draw curved path
                const midY = (y1 + y2) / 2;
                const path = \`M \${x1} \${y1} C \${x1} \${midY}, \${x2} \${midY}, \${x2} \${y2}\`;
                
                svg += \`<path d="\${path}" stroke="#666" stroke-width="2" fill="none" marker-end="url(#arrowhead)" />\`;
                
                // Add edge label if present
                if (edge.label) {
                    const labelX = (x1 + x2) / 2;
                    const labelY = midY;
                    svg += \`<text x="\${labelX}" y="\${labelY}" text-anchor="middle" font-size="11" fill="#666" style="background: white;">\${edge.label}\</text>\`;
                }
            });
            
            // Draw nodes
            nodes.forEach(node => {
                const pos = positions.nodes[node.id];
                if (!pos) return;
                
                const x = pos.x;
                const y = pos.y;
                
                // Choose color based on state type
                let fillColor = '#e3f2fd';
                let strokeColor = '#2196f3';
                
                if (node.type === 'end') {
                    fillColor = '#ffebee';
                    strokeColor = '#f44336';
                } else if (node.type === 'choice') {
                    fillColor = '#fff3e0';
                    strokeColor = '#ff9800';
                } else if (node.type === 'input') {
                    fillColor = '#f3e5f5';
                    strokeColor = '#9c27b0';
                } else if (node.type === 'prompt') {
                    fillColor = '#e8f5e9';
                    strokeColor = '#4caf50';
                }
                
                // Draw node box
                const boxWidth = 140;
                const boxHeight = 60;
                svg += \`<rect x="\${x - boxWidth/2}" y="\${y - boxHeight/2}" width="\${boxWidth}" height="\${boxHeight}" rx="8" fill="\${fillColor}" stroke="\${strokeColor}" stroke-width="\${node.isStart ? 3 : 2}" />\`;
                
                // Add start indicator
                if (node.isStart) {
                    svg += \`<text x="\${x}" y="\${y - boxHeight/2 - 10}" text-anchor="middle" font-size="12" fill="#4caf50" font-weight="bold">▼ START\</text>\`;
                }
                
                // Add node label (truncate if too long)
                const labelText = node.label.length > 15 ? node.label.substring(0, 13) + '...' : node.label;
                svg += \`<text x="\${x}" y="\${y}" text-anchor="middle" font-size="13" font-weight="600" fill="#333">\${labelText}\</text>\`;
                
                // Add type label
                svg += \`<text x="\${x}" y="\${y + 16}" text-anchor="middle" font-size="10" fill="#666">\${node.type}\</text>\`;
            });
            
            svg += '</svg>';
            container.innerHTML = svg;
        }
        
        function layoutGraph(nodes, edges, startState) {
            // Simple hierarchical layout
            const positions = {};
            const levels = {};
            const visited = new Set();
            
            // Build adjacency list
            const adjacency = {};
            nodes.forEach(node => adjacency[node.id] = []);
            edges.forEach(edge => {
                if (adjacency[edge.from]) {
                    adjacency[edge.from].push(edge.to);
                }
            });
            
            // BFS to assign levels
            const queue = [{ id: startState, level: 0 }];
            levels[startState] = 0;
            visited.add(startState);
            
            while (queue.length > 0) {
                const { id, level } = queue.shift();
                
                if (adjacency[id]) {
                    adjacency[id].forEach(nextId => {
                        if (!visited.has(nextId)) {
                            visited.add(nextId);
                            levels[nextId] = level + 1;
                            queue.push({ id: nextId, level: level + 1 });
                        }
                    });
                }
            }
            
            // Assign positions to unvisited nodes (disconnected from start)
            nodes.forEach(node => {
                if (!visited.has(node.id)) {
                    const maxLevel = Object.keys(levels).length > 0 ? Math.max(...Object.values(levels)) : -1;
                    levels[node.id] = maxLevel + 1;
                }
            });
            
            // Group nodes by level
            const levelGroups = {};
            Object.keys(levels).forEach(nodeId => {
                const level = levels[nodeId];
                if (!levelGroups[level]) levelGroups[level] = [];
                levelGroups[level].push(nodeId);
            });
            
            // Position nodes
            const GRAPH_WIDTH = 800;
            const levelHeight = 150;
            const nodeSpacing = 180;
            let maxY = 0;
            
            Object.keys(levelGroups).forEach(level => {
                const nodesInLevel = levelGroups[level];
                const y = 80 + parseInt(level) * levelHeight;
                maxY = Math.max(maxY, y);
                
                const totalWidth = (nodesInLevel.length - 1) * nodeSpacing;
                const startX = (GRAPH_WIDTH - totalWidth) / 2;
                
                nodesInLevel.forEach((nodeId, idx) => {
                    positions[nodeId] = {
                        x: startX + idx * nodeSpacing,
                        y: y
                    };
                });
            });
            
            return { nodes: positions, maxY };
        }
        
        async function showWorkflowDetails(fileName) {
            const workflow = workflows.find(wf => wf.fileName === fileName);
            if (!workflow || !workflow.valid) return;
            
            try {
                const response = await fetch(\`/api/workflows/\${fileName}\`);
                const data = await response.json();
                
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = \`
                    <h3>Workflow Information</h3>
                    <p><strong>Name:</strong> \${data.name}</p>
                    \${data.description ? \`<p><strong>Description:</strong> \${data.description}</p>\` : ''}
                    <p><strong>Default Model:</strong> \${data.default_model || 'Not specified'}</p>
                    <p><strong>Start State:</strong> \${data.start_state}</p>
                    <p><strong>Total States:</strong> \${Object.keys(data.states).length}</p>
                    
                    <h3 style="margin-top: 20px;">Workflow Graph</h3>
                    <div id="workflow-graph" style="margin: 20px 0; overflow-x: auto;"></div>
                    
                    <h3 style="margin-top: 20px;">States</h3>
                    <pre>\${JSON.stringify(data.states, null, 2)}</pre>
                    
                    \${data.mcp_servers ? \`
                        <h3 style="margin-top: 20px;">MCP Servers</h3>
                        <pre>\${JSON.stringify(data.mcp_servers, null, 2)}</pre>
                    \` : ''}
                \`;
                
                document.getElementById('modal-title').textContent = data.name;
                document.getElementById('workflow-modal').classList.add('active');
                
                // Render the graph after the modal content is added to the DOM
                renderWorkflowGraph(data, 'workflow-graph');
            } catch (error) {
                alert('Error loading workflow details: ' + error.message);
            }
        }
        
        function closeModal() {
            document.getElementById('workflow-modal').classList.remove('active');
        }
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
        
        // Close modal on background click
        document.getElementById('workflow-modal').addEventListener('click', (e) => {
            if (e.target.id === 'workflow-modal') closeModal();
        });
        
        // Load workflows on page load
        loadWorkflows();
    </script>
</body>
</html>`;
  }

  private getExecutionHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Execution - AI Workflow CLI</title>
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.umd.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js" crossorigin="anonymous"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            width: 100%;
        }
        
        header {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-actions {
            display: flex;
            gap: 10px;
        }
        
        h1 {
            color: #667eea;
            font-size: 24px;
        }
        
        .back-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
        }
        
        .back-btn:hover {
            background: #5568d3;
        }
        
        .stop-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            display: none;
        }
        
        .stop-btn:hover {
            background: #c82333;
        }
        
        .stop-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .stop-btn.active {
            display: inline-block;
        }
        
        .chat-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 80%;
            line-height: 1.5;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .message.system {
            background: #e3f2fd;
            color: #1976d2;
            align-self: flex-start;
        }
        
        .message.log {
            background: #f5f5f5;
            color: #666;
            align-self: flex-start;
        }
        
        .message.response {
            background: #667eea;
            color: white;
            align-self: flex-start;
            max-width: 90%;
        }
        
        .message.error {
            background: #ffebee;
            color: #c62828;
            align-self: flex-start;
        }
        
        .message.user {
            background: #e8eaf6;
            color: #333;
            align-self: flex-end;
        }
        
        .message.state-change {
            background: #fff3e0;
            color: #e65100;
            align-self: center;
            font-weight: 600;
            max-width: 100%;
            text-align: center;
        }
        
        /* Markdown styles for response messages */
        .message.response h1,
        .message.response h2,
        .message.response h3,
        .message.response h4,
        .message.response h5,
        .message.response h6 {
            margin-top: 16px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .message.response h1 { font-size: 1.5em; }
        .message.response h2 { font-size: 1.3em; }
        .message.response h3 { font-size: 1.1em; }
        
        .message.response p {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        
        .message.response ul,
        .message.response ol {
            margin-left: 20px;
            margin-bottom: 8px;
        }
        
        .message.response li {
            margin-bottom: 4px;
        }
        
        .message.response code {
            background: rgba(0, 0, 0, 0.2);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        .message.response pre {
            background: rgba(0, 0, 0, 0.2);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 8px 0;
        }
        
        .message.response pre code {
            background: transparent;
            padding: 0;
        }
        
        .message.response blockquote {
            border-left: 4px solid rgba(255, 255, 255, 0.5);
            padding-left: 12px;
            margin: 8px 0;
            font-style: italic;
        }
        
        .message.response a {
            color: #fff;
            text-decoration: underline;
        }
        
        .message.response hr {
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            margin: 12px 0;
        }
        
        .message.response table {
            border-collapse: collapse;
            width: 100%;
            margin: 8px 0;
        }
        
        .message.response th,
        .message.response td {
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px;
            text-align: left;
        }
        
        .message.response th {
            background: rgba(0, 0, 0, 0.2);
            font-weight: 600;
        }
        
        .input-container {
            border-top: 2px solid #e0e0e0;
            padding: 15px 20px;
            display: none;
            gap: 10px;
        }
        
        .input-container.active {
            display: flex;
        }
        
        .input-field {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }
        
        .input-field:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .send-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }
        
        .send-btn:hover {
            background: #218838;
        }
        
        .send-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .status {
            padding: 10px 20px;
            text-align: center;
            background: #f5f5f5;
            font-size: 14px;
            color: #666;
        }
        
        .status.complete {
            background: #d4edda;
            color: #155724;
        }
        
        .status.stopped {
            background: #fff3cd;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 id="workflow-title">🚀 Workflow Execution</h1>
            <div class="header-actions">
                <button id="stop-btn" class="stop-btn">⏹ Stop</button>
                <a href="/" class="back-btn">← Back to Workflows</a>
            </div>
        </header>
        
        <div class="chat-container">
            <div class="chat-messages" id="chat-messages">
                <div class="message system">Connecting to workflow...</div>
            </div>
            
            <div class="status" id="status">Initializing...</div>
            
            <div class="input-container" id="input-container">
                <input type="text" id="input-field" class="input-field" placeholder="Type your response...">
                <button id="send-btn" class="send-btn">Send</button>
            </div>
        </div>
    </div>
    
    <script>
        const fileName = window.location.pathname.split('/').pop();
        let sessionId = null;
        let eventSource = null;
        
        // Configure marked for safe HTML rendering
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        
        // Get workflow info
        async function loadWorkflowInfo() {
            try {
                const response = await fetch(\`/api/workflows/\${fileName}\`);
                const data = await response.json();
                document.getElementById('workflow-title').textContent = \`🚀 \${data.name}\`;
            } catch (error) {
                console.error('Failed to load workflow info:', error);
            }
        }
        
        function addMessage(type, message) {
            const messagesContainer = document.getElementById('chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            // Render markdown for response messages with sanitization
            if (type === 'response') {
                const rawHtml = marked.parse(message);
                const cleanHtml = DOMPurify.sanitize(rawHtml);
                messageDiv.innerHTML = cleanHtml;
            } else {
                messageDiv.textContent = message;
            }
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function showInputField(prompt, defaultValue) {
            const inputContainer = document.getElementById('input-container');
            const inputField = document.getElementById('input-field');
            inputField.placeholder = prompt || 'Type your response...';
            if (defaultValue) {
                inputField.value = defaultValue;
            }
            inputContainer.classList.add('active');
            inputField.focus();
        }
        
        function hideInputField() {
            const inputContainer = document.getElementById('input-container');
            inputContainer.classList.remove('active');
        }
        
        async function sendInput(input) {
            if (!input || !sessionId) return;
            
            addMessage('user', input);
            hideInputField();
            
            try {
                await fetch(\`/api/workflows/\${fileName}/input\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, input })
                });
                
                document.getElementById('input-field').value = '';
            } catch (error) {
                addMessage('error', 'Failed to send input: ' + error.message);
            }
        }
        
        async function stopWorkflow() {
            if (!sessionId) return;
            
            const stopBtn = document.getElementById('stop-btn');
            stopBtn.disabled = true;
            stopBtn.textContent = '⏹ Stopping...';
            
            try {
                await fetch(\`/api/workflows/\${fileName}/stop\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                });
            } catch (error) {
                addMessage('error', 'Failed to stop workflow: ' + error.message);
                stopBtn.disabled = false;
                stopBtn.textContent = '⏹ Stop';
            }
        }
        
        function connectToWorkflow() {
            eventSource = new EventSource(\`/api/workflows/\${fileName}/execute\`);
            
            eventSource.onopen = (e) => {
                document.getElementById('status').textContent = 'Connecting...';
            };
            
            eventSource.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);
                    
                    // Capture session ID from the connection event
                    if (event.data && event.data.sessionId && !sessionId && event.type === 'log' && event.message === 'Connected') {
                        sessionId = event.data.sessionId;
                        document.getElementById('status').textContent = 'Running...';
                        // Show stop button
                        document.getElementById('stop-btn').classList.add('active');
                    }
                    
                    switch (event.type) {
                        case 'log':
                            addMessage('log', event.message);
                            break;
                        case 'state_change':
                            addMessage('state-change', event.message);
                            break;
                        case 'response':
                            addMessage('response', event.message);
                            break;
                        case 'prompt':
                            showInputField(event.message);
                            break;
                        case 'input':
                            showInputField('Enter your response', event.data.defaultValue);
                            break;
                        case 'error':
                            addMessage('error', event.message);
                            break;
                        case 'stopped':
                            addMessage('system', event.message);
                            document.getElementById('status').textContent = 'Workflow stopped by user';
                            document.getElementById('status').classList.add('stopped');
                            document.getElementById('stop-btn').classList.remove('active');
                            hideInputField();
                            eventSource.close();
                            break;
                        case 'complete':
                            addMessage('system', event.message);
                            document.getElementById('status').textContent = 'Workflow completed successfully';
                            document.getElementById('status').classList.add('complete');
                            document.getElementById('stop-btn').classList.remove('active');
                            hideInputField();
                            eventSource.close();
                            break;
                    }
                } catch (error) {
                    console.error('Failed to parse event:', error);
                }
            };
            
            eventSource.onerror = (e) => {
                addMessage('error', 'Connection error. Please try again.');
                document.getElementById('status').textContent = 'Connection lost';
                document.getElementById('stop-btn').classList.remove('active');
                eventSource.close();
            };
        }
        
        // Setup stop button
        document.getElementById('stop-btn').onclick = () => {
            stopWorkflow();
        };
        
        // Setup send button
        document.getElementById('send-btn').onclick = () => {
            const input = document.getElementById('input-field').value.trim();
            if (input) {
                sendInput(input);
            }
        };
        
        // Setup enter key
        document.getElementById('input-field').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = e.target.value.trim();
                if (input) {
                    sendInput(input);
                }
            }
        });
        
        // Load workflow info and start execution
        loadWorkflowInfo();
        connectToWorkflow();
    </script>
</body>
</html>`;
  }

  /**
   * Start the web server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, () => {
          console.log(`\n🚀 AI Workflow Web UI is running!`);
          console.log(`📁 Workflow directory: ${this.options.workflowDir}`);
          console.log(`🌐 Open your browser to: http://localhost:${this.options.port}`);
          console.log(`🤖 Ollama URL: ${this.options.ollamaUrl}`);
          console.log(`\nPress Ctrl+C to stop the server.\n`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.options.port} is already in use. Try a different port with --port option.`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the web server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

export = WebServer;
