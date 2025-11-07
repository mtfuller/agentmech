const WorkflowParser = require('../../dist/core/workflow-parser');
const FileHandler = require('../../dist/utils/file-handler');
const path = require('path');

describe('Multimodal Workflow Integration', () => {
  describe('Text File Analysis Workflow', () => {
    test('should parse workflow with files parameter', () => {
      const workflowPath = path.join(__dirname, '..', '..', 'examples', 'text-file-analysis.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Text File Analysis');
      expect(workflow.states.analyze_files).toBeDefined();
      expect(workflow.states.analyze_files.files).toEqual([
        'examples/multimodal-demo/sample-text.txt',
        'examples/multimodal-demo/data.json'
      ]);
    });
    
    test('should process example text files', async () => {
      const textFile = path.join(__dirname, '..', '..', 'examples', 'multimodal-demo', 'sample-text.txt');
      const jsonFile = path.join(__dirname, '..', '..', 'examples', 'multimodal-demo', 'data.json');
      
      const processedText = await FileHandler.processFile(textFile);
      const processedJson = await FileHandler.processFile(jsonFile);
      
      expect(processedText.type).toBe('text');
      expect(processedText.content).toContain('artificial intelligence');
      
      expect(processedJson.type).toBe('text');
      expect(processedJson.content).toContain('AI Workflow CLI');
    });
  });
  
  describe('Image Analysis Workflow', () => {
    test('should parse workflow with image files parameter', () => {
      const workflowPath = path.join(__dirname, '..', '..', 'examples', 'image-analysis.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Multimodal Image Analysis');
      expect(workflow.default_model).toBe('llava');
      expect(workflow.states.analyze_image).toBeDefined();
      expect(workflow.states.analyze_image.files).toEqual([
        'examples/multimodal-demo/test-image.png'
      ]);
    });
    
    test('should process example image file', async () => {
      const imageFile = path.join(__dirname, '..', '..', 'examples', 'multimodal-demo', 'test-image.png');
      
      const processed = await FileHandler.processFile(imageFile);
      
      expect(processed.type).toBe('image');
      expect(processed.filename).toBe('test-image.png');
      expect(processed.mimeType).toBe('image/png');
      expect(processed.content).toBeTruthy(); // Should have base64 content
      expect(typeof processed.content).toBe('string');
    });
  });
  
  describe('Multimodal Combined Workflow', () => {
    test('should parse workflow with multiple file types', () => {
      const workflowPath = path.join(__dirname, '..', '..', 'examples', 'multimodal-analysis.yaml');
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Multimodal Text and Image Analysis');
      expect(workflow.states.analyze_data).toBeDefined();
      expect(workflow.states.analyze_data.files).toHaveLength(2);
      
      expect(workflow.states.analyze_with_image).toBeDefined();
      expect(workflow.states.analyze_with_image.files).toEqual([
        'examples/multimodal-demo/test-image.png'
      ]);
    });
  });
  
  describe('File Type Detection', () => {
    test('should correctly identify different file types', () => {
      expect(FileHandler.getFileType('image.jpg')).toBe('image');
      expect(FileHandler.getFileType('image.png')).toBe('image');
      expect(FileHandler.getFileType('doc.txt')).toBe('text');
      expect(FileHandler.getFileType('data.json')).toBe('text');
      expect(FileHandler.getFileType('readme.md')).toBe('text');
      expect(FileHandler.getFileType('file.pdf')).toBe('pdf');
      expect(FileHandler.getFileType('doc.docx')).toBe('word');
    });
  });
});
