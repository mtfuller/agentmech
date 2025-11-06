/**
 * Calculator tool - performs basic arithmetic operations
 */

function calculator(args) {
  const { operation, a, b } = args;
  
  switch (operation) {
    case 'add':
      return { result: a + b };
    case 'subtract':
      return { result: a - b };
    case 'multiply':
      return { result: a * b };
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      return { result: a / b };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// Add metadata to the function
calculator.description = 'Performs basic arithmetic operations (add, subtract, multiply, divide)';
calculator.inputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['add', 'subtract', 'multiply', 'divide'],
      description: 'The arithmetic operation to perform',
    },
    a: {
      type: 'number',
      description: 'First number',
    },
    b: {
      type: 'number',
      description: 'Second number',
    },
  },
  required: ['operation', 'a', 'b'],
};

module.exports = calculator;
