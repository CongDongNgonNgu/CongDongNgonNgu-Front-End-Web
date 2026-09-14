import { describe, expect, it } from 'vitest';
import {
  buildCreatePostPayload,
  countUnicodeCodePoints,
  validateCommentInput,
  validateComposerInput,
} from './community-validation';

describe('community composer validation', () => {
  it('counts Unicode code points rather than UTF-16 code units', () => {
    expect(countUnicodeCodePoints('A😀界')).toBe(3);
  });

  it('rejects missing required fields and whitespace-only content', () => {
    expect(validateComposerInput({
      postType: '',
      languageCode: '',
      content: ' \n\t',
      cefrLevel: '',
      topic: '',
      visibility: 'PUBLIC',
    })).toEqual({
      postType: 'Vui lòng chọn loại bài viết.',
      languageCode: 'Vui lòng chọn ngôn ngữ mục tiêu.',
      content: 'Nội dung không thể chỉ chứa khoảng trắng.',
    });
  });

  it('enforces the 20,000 code point content boundary and 80-character topic boundary', () => {
    const valid = {
      postType: 'DISCUSSION',
      languageCode: 'en',
      content: '😀'.repeat(20_000),
      cefrLevel: '',
      topic: 'a'.repeat(80),
      visibility: 'PUBLIC',
    } as const;
    expect(validateComposerInput(valid)).toEqual({});
    expect(validateComposerInput({ ...valid, content: `${valid.content}😀` }).content)
      .toContain('20.000');
    expect(validateComposerInput({ ...valid, topic: `${valid.topic}a` }).topic)
      .toContain('80');
  });

  it('maps only backend-supported create fields and omits blank optional values', () => {
    expect(buildCreatePostPayload({
      postType: 'QUESTION',
      languageCode: 'en',
      content: '  Explain this phrase.  ',
      cefrLevel: '',
      topic: '  workplace  ',
      visibility: 'PUBLIC',
    })).toEqual({
      postType: 'QUESTION',
      languageCode: 'en',
      content: '  Explain this phrase.  ',
      topic: '  workplace  ',
      visibility: 'PUBLIC',
    });
  });

  it('blocks whitespace-only comments and enforces the backend 5,000-code-point limit', () => {
    expect(validateCommentInput({ content: ' \n\t' })).toEqual({
      content: 'Bình luận không thể chỉ chứa khoảng trắng.',
    });

    const valid = { content: '😀'.repeat(5_000) };
    expect(validateCommentInput(valid)).toEqual({});
    expect(validateCommentInput({ content: `${valid.content}😀` }).content)
      .toContain('5.000');
  });
});
