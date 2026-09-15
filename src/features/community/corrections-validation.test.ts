import { describe, expect, it } from 'vitest';
import {
  buildCorrectionRequestPayload,
  buildQuestionPayload,
  validateCorrectionRequestInput,
  validateQuestionInput,
} from './corrections-validation';

describe('correction request validation', () => {
  it('preserves the original text exactly while validating Unicode code points', () => {
    const originalText = '  é  \r\n下一行 😀  ';
    const input = {
      languageCode: 'en',
      originalText,
      correctionIntent: 'NATURALNESS',
      context: 'A little context',
      cefrLevel: 'B1',
      topic: 'daily practice',
      visibility: 'PUBLIC',
    };

    expect(validateCorrectionRequestInput(input)).toEqual({});
    expect(buildCorrectionRequestPayload(input)).toEqual({
      languageCode: 'en',
      originalText,
      correctionIntent: 'NATURALNESS',
      context: 'A little context',
      cefrLevel: 'B1',
      topic: 'daily practice',
      visibility: 'PUBLIC',
    });
  });

  it('enforces the correction boundaries without normalizing user text', () => {
    expect(validateCorrectionRequestInput({
      languageCode: 'en',
      originalText: '   \n\t',
      correctionIntent: 'GRAMMAR',
      context: '',
      cefrLevel: '',
      topic: '',
      visibility: 'PUBLIC',
    }).originalText).toBe('Nội dung cần có chữ hoặc ký tự khác khoảng trắng.');

    expect(validateCorrectionRequestInput({
      languageCode: 'en',
      originalText: '😀'.repeat(20_001),
      correctionIntent: 'GRAMMAR',
      context: '',
      cefrLevel: '',
      topic: '',
      visibility: 'PUBLIC',
    }).originalText).toContain('20.000');

    expect(validateCorrectionRequestInput({
      languageCode: '',
      originalText: 'Valid text',
      correctionIntent: '',
      context: 'x'.repeat(5_001),
      cefrLevel: 'C3',
      topic: 'x'.repeat(81),
      visibility: 'UNLISTED',
    })).toMatchObject({
      languageCode: 'Vui lòng chọn ngôn ngữ mục tiêu.',
      correctionIntent: 'Vui lòng chọn mục tiêu cần cộng đồng hỗ trợ.',
      context: expect.stringContaining('5.000'),
      cefrLevel: 'Vui lòng chọn trình độ CEFR hợp lệ.',
      topic: expect.stringContaining('80'),
      visibility: 'Vui lòng chọn phạm vi hiển thị hợp lệ.',
    });
  });
});

describe('question validation', () => {
  it('builds only the supported question fields and preserves content', () => {
    const content = '  How would a native speaker say this?\n😀  ';
    const input = {
      languageCode: 'ja',
      content,
      cefrLevel: 'A2',
      topic: 'travel',
      visibility: 'PRIVATE',
    };

    expect(validateQuestionInput(input)).toEqual({});
    expect(buildQuestionPayload(input)).toEqual({
      languageCode: 'ja',
      content,
      cefrLevel: 'A2',
      topic: 'travel',
      visibility: 'PRIVATE',
    });
    expect(Object.keys(buildQuestionPayload(input))).not.toContain('title');
  });

  it('rejects whitespace-only and overlong question content', () => {
    expect(validateQuestionInput({
      languageCode: 'en',
      content: '\n\t',
      cefrLevel: '',
      topic: '',
      visibility: 'PUBLIC',
    }).content).toContain('không thể chỉ chứa');

    expect(validateQuestionInput({
      languageCode: 'en',
      content: '😀'.repeat(20_001),
      cefrLevel: '',
      topic: '',
      visibility: 'PUBLIC',
    }).content).toContain('20.000');
  });
});
