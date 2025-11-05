import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import WorkflowDiscovery = require('./workflow-discovery');
import WorkflowParser = require('./workflow-parser');
import WorkflowExecutor = require('./workflow-executor');

interface ServeOptions {
  port: number;
  workflowDir: string;
  ollamaUrl: string;
}

class WebServer {
  private app: express.Application;
  private options: ServeOptions;
  private server: any;

  constructor(options: ServeOptions) {
    this.options = options;
    this.app = express();
    
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

    // API: Execute workflow (stub - actual execution would need WebSocket or SSE)
    this.app.post('/api/workflows/:fileName/execute', (req: Request, res: Response) => {
      try {
        const filePath = path.join(this.options.workflowDir, req.params.fileName);
        
        // Security check: ensure file is within workflow directory
        const resolvedPath = path.resolve(filePath);
        const resolvedDir = path.resolve(this.options.workflowDir);
        if (!resolvedPath.startsWith(resolvedDir)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        // For now, just return a message indicating execution would start
        // Full implementation would require WebSocket or Server-Sent Events
        res.json({
          message: 'Workflow execution is not yet fully supported in web UI. Please use CLI for execution.',
          suggestion: `Run: ai-workflow run ${filePath}`
        });
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
            cursor: pointer;
        }
        
        .workflow-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            transform: translateY(-2px);
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
            max-width: 800px;
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
                <div class="workflow-card \${wf.valid ? '' : 'invalid'}" onclick="showWorkflowDetails('\${wf.fileName}')">
                    <div class="workflow-name">
                        \${wf.name}
                        <span class="badge \${wf.valid ? 'valid' : 'invalid'}">
                            \${wf.valid ? '✓ Valid' : '✗ Invalid'}
                        </span>
                    </div>
                    \${wf.description ? \`<div class="workflow-description">\${wf.description}</div>\` : ''}
                    <div class="workflow-file">\${wf.fileName}</div>
                    \${wf.error ? \`<div class="workflow-error"><strong>Error:</strong> \${wf.error}</div>\` : ''}
                </div>
            \`).join('');
        }
        
        async function showWorkflowDetails(fileName) {
            const workflow = workflows.find(wf => wf.fileName === fileName);
            if (!workflow || !workflow.valid) return;
            
            try {
                const response = await fetch(\`/api/workflows/\${fileName}\`);
                const data = await response.json();
                
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = \`
                    <div class="info-box">
                        <strong>Note:</strong> Workflow execution through the web UI is coming soon!<br>
                        For now, use the CLI command: <code>ai-workflow run \${workflow.filePath}</code>
                    </div>
                    
                    <h3>Workflow Information</h3>
                    <p><strong>Name:</strong> \${data.name}</p>
                    \${data.description ? \`<p><strong>Description:</strong> \${data.description}</p>\` : ''}
                    <p><strong>Default Model:</strong> \${data.default_model || 'Not specified'}</p>
                    <p><strong>Start State:</strong> \${data.start_state}</p>
                    <p><strong>Total States:</strong> \${Object.keys(data.states).length}</p>
                    
                    <h3 style="margin-top: 20px;">States</h3>
                    <pre>\${JSON.stringify(data.states, null, 2)}</pre>
                    
                    \${data.mcp_servers ? \`
                        <h3 style="margin-top: 20px;">MCP Servers</h3>
                        <pre>\${JSON.stringify(data.mcp_servers, null, 2)}</pre>
                    \` : ''}
                \`;
                
                document.getElementById('modal-title').textContent = data.name;
                document.getElementById('workflow-modal').classList.add('active');
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
