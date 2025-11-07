const { TestExecutor } = require('../../dist/testing/test-executor');

describe('Contains Assertion Options', () => {
  let executor;

  beforeEach(() => {
    executor = new TestExecutor();
  });

  describe('Case-insensitive matching', () => {
    test('should match case-insensitively when case_sensitive is false', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'hello',
        case_sensitive: false
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('case-insensitive');
    });

    test('should match case-sensitively by default', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'hello'
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
    });

    test('should match case-sensitively when case_sensitive is true', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'HELLO',
        case_sensitive: true
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
    });

    test('should fail case-insensitive match when substring not present', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'goodbye',
        case_sensitive: false
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('case-insensitive');
    });
  });

  describe('Regex pattern matching', () => {
    test('should match with regex pattern when regex is true', () => {
      const assertion = {
        type: 'contains',
        target: 'email',
        value: '[a-z]+@[a-z]+\\.com',
        regex: true
      };
      const context = { email: 'user@example.com' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('pattern');
    });

    test('should fail regex match when pattern does not match', () => {
      const assertion = {
        type: 'contains',
        target: 'email',
        value: '^[0-9]+$',
        regex: true
      };
      const context = { email: 'user@example.com' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('pattern');
    });

    test('should handle invalid regex pattern gracefully', () => {
      const assertion = {
        type: 'contains',
        target: 'text',
        value: '[invalid(',
        regex: true
      };
      const context = { text: 'some text' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Invalid regex pattern');
    });

    test('should support case-insensitive regex when both flags are set', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'hello',
        regex: true,
        case_sensitive: false
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('/i');
    });

    test('should use case-sensitive regex by default', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'hello',
        regex: true
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
    });
  });

  describe('not_contains with case-insensitive matching', () => {
    test('should pass when substring not present (case-insensitive)', () => {
      const assertion = {
        type: 'not_contains',
        target: 'message',
        value: 'goodbye',
        case_sensitive: false
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('case-insensitive');
    });

    test('should fail when substring present (case-insensitive)', () => {
      const assertion = {
        type: 'not_contains',
        target: 'message',
        value: 'hello',
        case_sensitive: false
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('case-insensitive');
    });

    test('should pass when substring present with different case (case-sensitive)', () => {
      const assertion = {
        type: 'not_contains',
        target: 'message',
        value: 'hello',
        case_sensitive: true
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('not_contains with regex matching', () => {
    test('should pass when regex pattern does not match', () => {
      const assertion = {
        type: 'not_contains',
        target: 'email',
        value: '^[0-9]+$',
        regex: true
      };
      const context = { email: 'user@example.com' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('pattern');
    });

    test('should fail when regex pattern matches', () => {
      const assertion = {
        type: 'not_contains',
        target: 'email',
        value: '[a-z]+@[a-z]+\\.com',
        regex: true
      };
      const context = { email: 'user@example.com' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('pattern');
    });

    test('should support case-insensitive regex for not_contains', () => {
      const assertion = {
        type: 'not_contains',
        target: 'message',
        value: 'hello',
        regex: true,
        case_sensitive: false
      };
      const context = { message: 'HELLO WORLD' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('/i');
    });
  });

  describe('Backward compatibility', () => {
    test('should maintain default behavior without options', () => {
      const assertion = {
        type: 'contains',
        target: 'message',
        value: 'hello'
      };
      const context = { message: 'hello world' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
    });

    test('should maintain case-sensitive default for not_contains', () => {
      const assertion = {
        type: 'not_contains',
        target: 'message',
        value: 'HELLO'
      };
      const context = { message: 'hello world' };
      
      const result = executor.evaluateAssertion(assertion, context, []);
      
      expect(result.passed).toBe(true);
    });
  });
});
