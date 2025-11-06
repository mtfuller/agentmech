/**
 * JSON utility tool - provides JSON parsing, validation, and transformation
 */

function jsonUtil(args) {
  const { operation, input, path } = args;
  
  switch (operation) {
    case 'parse':
      try {
        const parsed = JSON.parse(input);
        return { result: parsed };
      } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
      
    case 'stringify':
      try {
        const stringified = JSON.stringify(input, null, 2);
        return { result: stringified };
      } catch (error) {
        throw new Error(`Failed to stringify: ${error.message}`);
      }
      
    case 'validate':
      try {
        JSON.parse(input);
        return { result: true, message: 'Valid JSON' };
      } catch (error) {
        return { result: false, message: error.message };
      }
      
    case 'extract':
      try {
        const obj = typeof input === 'string' ? JSON.parse(input) : input;
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
          if (value === null || value === undefined) {
            throw new Error(`Path not found: ${path}`);
          }
          value = value[key];
        }
        
        return { result: value };
      } catch (error) {
        throw new Error(`Failed to extract path: ${error.message}`);
      }
      
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

jsonUtil.description = 'JSON utilities for parsing, validation, and extraction';
jsonUtil.inputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['parse', 'stringify', 'validate', 'extract'],
      description: 'The JSON operation to perform',
    },
    input: {
      description: 'Input data (string for parse/validate, object for stringify/extract)',
    },
    path: {
      type: 'string',
      description: 'Dot-separated path for extract operation (e.g., "user.name")',
    },
  },
  required: ['operation', 'input'],
};

module.exports = jsonUtil;
