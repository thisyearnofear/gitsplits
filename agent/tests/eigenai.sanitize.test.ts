import { sanitizeEigenAiContent } from '../src/tools/eigenai';

describe('sanitizeEigenAiContent', () => {
  test('strips hidden reasoning block and keeps final answer', () => {
    const raw =
      '<|channel|>analysis<|message|>internal thoughts<|end|>Hello! How can I assist you today?';

    expect(sanitizeEigenAiContent(raw)).toBe('Hello! How can I assist you today?');
  });

  test('strips remaining control tokens', () => {
    const raw = '<|channel|>final<|message|>Clean output';
    expect(sanitizeEigenAiContent(raw)).toBe('Clean output');
  });

  test('keeps plain content unchanged', () => {
    const raw = 'Normal assistant response.';
    expect(sanitizeEigenAiContent(raw)).toBe('Normal assistant response.');
  });
});
