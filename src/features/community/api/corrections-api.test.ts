import { describe, expect, it, vi } from 'vitest';
import { CorrectionsApi } from './corrections-api';
import type { CommunityRequestClient } from '../community.types';

describe('CorrectionsApi structured response contract', () => {
  it('uses protected writes and the separate structured Helpful and acceptance resources', async () => {
    const client: CommunityRequestClient = {
      requestPublic: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      requestProtected: vi.fn().mockResolvedValue({}),
    };
    const api = new CorrectionsApi(client);

    await api.listStructuredResponses('post-1', { limit: 20 }, false);
    await api.createStructuredResponse('post-1', {
      responseKind: 'CORRECTION_PROPOSAL',
      correctedText: 'I have a book.',
    });
    await api.addStructuredResponseHelpful('response-1');
    await api.removeStructuredResponseHelpful('response-1');
    await api.acceptStructuredResponse('post-1', 'response-1');
    await api.revokeStructuredResponseAcceptance('post-1');

    expect(client.requestPublic).toHaveBeenCalledWith('/community/posts/post-1/structured-responses?limit=20');
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      1,
      '/community/posts/post-1/structured-responses',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({
        responseKind: 'CORRECTION_PROPOSAL',
        correctedText: 'I have a book.',
      }) }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(2, '/community/structured-responses/response-1/helpful', { method: 'PUT' });
    expect(client.requestProtected).toHaveBeenNthCalledWith(3, '/community/structured-responses/response-1/helpful', { method: 'DELETE' });
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      4,
      '/community/posts/post-1/accepted-response',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ responseId: 'response-1' }) }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(5, '/community/posts/post-1/accepted-response', { method: 'DELETE' });
  });
});
