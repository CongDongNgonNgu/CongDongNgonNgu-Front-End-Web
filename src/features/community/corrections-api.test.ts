import { describe, expect, it, vi } from 'vitest';
import { CorrectionsApi } from './api/corrections-api';

describe('CorrectionsApi', () => {
  it('posts the exact correction request contract through the protected client', async () => {
    const client = {
      requestProtected: vi.fn().mockResolvedValue({ post: { id: 'post-1' }, correction: {} }),
      requestPublic: vi.fn(),
    };
    const api = new CorrectionsApi(client);
    const input = {
      languageCode: 'en',
      originalText: '  I has a book.  ',
      correctionIntent: 'GRAMMAR' as const,
      context: 'A classroom example',
      cefrLevel: 'A2' as const,
      topic: 'school',
      visibility: 'PUBLIC' as const,
    };

    await api.createCorrectionRequest(input);

    expect(client.requestProtected).toHaveBeenCalledWith(
      '/community/correction-requests',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(client.requestPublic).not.toHaveBeenCalled();
  });

  it('uses the question endpoint and preserves the real post response', async () => {
    const post = { id: 'question-1' };
    const client = {
      requestProtected: vi.fn().mockResolvedValue(post),
      requestPublic: vi.fn(),
    };
    const api = new CorrectionsApi(client);
    const input = {
      languageCode: 'ja',
      content: '  これは自然な言い方ですか？  ',
      visibility: 'PRIVATE' as const,
    };

    await expect(api.createQuestion(input)).resolves.toBe(post);
    expect(client.requestProtected).toHaveBeenCalledWith(
      '/community/questions',
      expect.objectContaining({ body: JSON.stringify(input) }),
    );
  });

  it('encodes detail identifiers for public reads', async () => {
    const client = {
      requestProtected: vi.fn(),
      requestPublic: vi.fn().mockResolvedValue({}),
    };
    const api = new CorrectionsApi(client);

    await api.getCorrectionRequest('post/with spaces');
    await api.getQuestion('question/with spaces');

    expect(client.requestPublic).toHaveBeenNthCalledWith(
      1,
      '/community/correction-requests/post%2Fwith%20spaces',
    );
    expect(client.requestPublic).toHaveBeenNthCalledWith(
      2,
      '/community/questions/question%2Fwith%20spaces',
    );
  });
});
