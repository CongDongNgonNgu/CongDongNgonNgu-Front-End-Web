import { describe, expect, it } from 'vitest';
import { buildStructuredDiff } from './structured-response-diff';

function originalText(result: ReturnType<typeof buildStructuredDiff>): string {
  return result.original.map((segment) => segment.text).join('');
}

function correctedText(result: ReturnType<typeof buildStructuredDiff>): string {
  return result.corrected.map((segment) => segment.text).join('');
}

describe('buildStructuredDiff', () => {
  it('marks a one-word replacement without changing either source string', () => {
    const result = buildStructuredDiff('I like tea.', 'I love tea.');
    expect(originalText(result)).toBe('I like tea.');
    expect(correctedText(result)).toBe('I love tea.');
    expect(result.original.some((segment) => segment.kind === 'delete' && segment.text.includes('like'))).toBe(true);
    expect(result.corrected.some((segment) => segment.kind === 'insert' && segment.text.includes('love'))).toBe(true);
  });

  it('handles sentence rewrites, deletion-only, and addition-only changes', () => {
    const rewrite = buildStructuredDiff('Tôi đã đi học ngày mai.', 'Ngày mai tôi sẽ đi học.');
    expect(originalText(rewrite)).toBe('Tôi đã đi học ngày mai.');
    expect(correctedText(rewrite)).toBe('Ngày mai tôi sẽ đi học.');
    expect(buildStructuredDiff('Keep this.', 'Keep.').corrected.some((segment) => segment.kind === 'delete')).toBe(false);
    expect(buildStructuredDiff('Keep.', 'Keep this.').corrected.some((segment) => segment.kind === 'insert')).toBe(true);
  });

  it('preserves long paragraphs, Vietnamese diacritics, CJK, spaces, and newlines', () => {
    const original = `${'Tôi học tiếng Việt. '.repeat(350)}\n  中文句子  `;
    const corrected = `${'Tôi đang học tiếng Việt. '.repeat(350)}\n  中文句子  `;
    const result = buildStructuredDiff(original, corrected);
    expect(originalText(result)).toBe(original);
    expect(correctedText(result)).toBe(corrected);
    expect(correctedText(result)).toContain('中文句子');
    expect(originalText(result)).toContain('\n  ');
  });

  it('does not split surrogate pairs or treat XSS-looking text as markup', () => {
    const original = 'Xin chào 👩🏽‍💻 <script>alert(1)</script>';
    const corrected = 'Xin chào 👩🏽‍💻 <script>console.log(1)</script>';
    const result = buildStructuredDiff(original, corrected);
    expect(originalText(result)).toBe(original);
    expect(correctedText(result)).toBe(corrected);
    expect(result.original.map((segment) => segment.text).join('')).not.toContain('\uFFFD');
    expect(result.corrected.map((segment) => segment.text).join('')).not.toContain('\uFFFD');
  });
});
