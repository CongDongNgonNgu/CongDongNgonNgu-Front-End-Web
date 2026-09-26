import { describe, expect, it, vi } from 'vitest';
import { LibraryReviewApi } from './library-review.api';

describe('LibraryReviewApi', () => {
  it('keeps reviewer cursors opaque and binds queue filters', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
    const api = new LibraryReviewApi({ requestProtected });

    await api.listReviewQueue({ q: 'xin chào', language: 'vi', type: 'SENTENCE', cursor: 'opaque-v2', limit: 12 });

    expect(requestProtected).toHaveBeenCalledWith(
      '/library/reviews?q=xin+ch%C3%A0o&language=vi&type=SENTENCE&cursor=opaque-v2&limit=12',
    );
  });

  it('uses the frozen review mutation endpoints and payloads', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ resource: { id: 'resource-1', reviewState: 'VERIFIED' }, audit: {} });
    const api = new LibraryReviewApi({ requestProtected });

    await api.transitionReview('resource/1', { nextState: 'VERIFIED' });
    await api.reconcileSource('resource-1', { note: 'Đã đối soát nguồn.' });

    expect(requestProtected).toHaveBeenNthCalledWith(1, '/library/resources/resource%2F1/review', {
      method: 'POST',
      body: JSON.stringify({ nextState: 'VERIFIED' }),
    });
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/library/reviews/resource-1/reconcile-source', {
      method: 'POST',
      body: JSON.stringify({ note: 'Đã đối soát nguồn.' }),
    });
  });
});
