const FileHandler = require('../../dist/utils/file-handler');
const fs = require('fs');
const path = require('path');

describe('FileHandler', () => {
  const testDir = path.join(__dirname, '..', '..', 'tmp-file-handler-test');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('getFileType', () => {
    test('should identify image files', () => {
      expect(FileHandler.getFileType('test.jpg')).toBe('image');
      expect(FileHandler.getFileType('test.png')).toBe('image');
      expect(FileHandler.getFileType('test.gif')).toBe('image');
      expect(FileHandler.getFileType('test.webp')).toBe('image');
    });
    
    test('should identify text files', () => {
      expect(FileHandler.getFileType('test.txt')).toBe('text');
      expect(FileHandler.getFileType('test.md')).toBe('text');
      expect(FileHandler.getFileType('test.json')).toBe('text');
      expect(FileHandler.getFileType('test.yaml')).toBe('text');
    });
    
    test('should identify PDF files', () => {
      expect(FileHandler.getFileType('test.pdf')).toBe('pdf');
    });
    
    test('should identify Word documents', () => {
      expect(FileHandler.getFileType('test.doc')).toBe('word');
      expect(FileHandler.getFileType('test.docx')).toBe('word');
    });
    
    test('should return unknown for unsupported types', () => {
      expect(FileHandler.getFileType('test.xyz')).toBe('unknown');
    });
  });
  
  describe('getMimeType', () => {
    test('should return correct MIME types for images', () => {
      expect(FileHandler.getMimeType('test.jpg')).toBe('image/jpeg');
      expect(FileHandler.getMimeType('test.png')).toBe('image/png');
      expect(FileHandler.getMimeType('test.gif')).toBe('image/gif');
    });
    
    test('should return correct MIME types for text files', () => {
      expect(FileHandler.getMimeType('test.txt')).toBe('text/plain');
      expect(FileHandler.getMimeType('test.json')).toBe('application/json');
    });
  });
  
  describe('processFile', () => {
    test('should process a text file', async () => {
      const testFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFile, 'Hello, World!');
      
      const result = await FileHandler.processFile(testFile);
      
      expect(result.type).toBe('text');
      expect(result.content).toBe('Hello, World!');
      expect(result.filename).toBe('test.txt');
      expect(result.mimeType).toBe('text/plain');
    });
    
    test('should process an image file as base64', async () => {
      const testFile = path.join(testDir, 'test.png');
      // Create a minimal valid PNG (1x1 transparent pixel)
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(testFile, pngBuffer);
      
      const result = await FileHandler.processFile(testFile);
      
      expect(result.type).toBe('image');
      expect(result.content).toBeTruthy(); // Should have base64 content
      expect(result.filename).toBe('test.png');
      expect(result.mimeType).toBe('image/png');
    });
    
    test('should throw error for non-existent file', async () => {
      await expect(FileHandler.processFile('/nonexistent/file.txt'))
        .rejects.toThrow('File not found');
    });
    
    test('should process PDF files and extract text', async () => {
      const PDFDocument = require('pdfkit');
      const testFile = path.join(testDir, 'test.pdf');
      
      // Create a proper PDF using pdfkit
      await new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(testFile);
        
        doc.pipe(stream);
        doc.fontSize(12).text('Hello PDF World', 100, 100);
        doc.end();
        
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      
      const result = await FileHandler.processFile(testFile);
      
      expect(result.type).toBe('pdf');
      expect(result.filename).toBe('test.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(typeof result.content).toBe('string');
      expect(result.content).toContain('Hello PDF World');
    });
    
    test('should process Word documents and extract text', async () => {
      const testFile = path.join(testDir, 'test.docx');
      // Create a minimal valid DOCX (ZIP with required structure)
      const JSZip = require('jszip');
      const zip = new JSZip();
      
      // Add minimal DOCX structure
      zip.file('[Content_Types].xml', 
        '<?xml version="1.0"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>'
      );
      
      zip.file('_rels/.rels',
        '<?xml version="1.0"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>'
      );
      
      zip.file('word/document.xml',
        '<?xml version="1.0"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        '<w:p><w:r><w:t>Hello World</w:t></w:r></w:p>' +
        '</w:body>' +
        '</w:document>'
      );
      
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      fs.writeFileSync(testFile, buffer);
      
      const result = await FileHandler.processFile(testFile);
      
      expect(result.type).toBe('word');
      expect(result.filename).toBe('test.docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(typeof result.content).toBe('string');
      expect(result.content).toContain('Hello World');
    });
    
    test('should throw error for unsupported file types', async () => {
      const testFile = path.join(testDir, 'test.xyz');
      fs.writeFileSync(testFile, 'unsupported content');
      
      await expect(FileHandler.processFile(testFile))
        .rejects.toThrow('Unsupported file type');
    });
  });
  
  describe('processFiles', () => {
    test('should process multiple files', async () => {
      const testFile1 = path.join(testDir, 'test1.txt');
      const testFile2 = path.join(testDir, 'test2.json');
      
      fs.writeFileSync(testFile1, 'Text file content');
      fs.writeFileSync(testFile2, '{"key": "value"}');
      
      const results = await FileHandler.processFiles([testFile1, testFile2]);
      
      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('test1.txt');
      expect(results[1].filename).toBe('test2.json');
    });
    
    test('should continue processing when one file fails', async () => {
      const testFile1 = path.join(testDir, 'test1.txt');
      const testFile2 = path.join(testDir, 'test2.xyz'); // unsupported file type
      
      fs.writeFileSync(testFile1, 'Text file content');
      fs.writeFileSync(testFile2, 'unsupported content');
      
      const results = await FileHandler.processFiles([testFile1, testFile2]);
      
      // Should only have 1 successful result (the text file)
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('test1.txt');
    });
  });
});
