import { describe, expect, it, vi } from 'vitest';
import { LibraryApi } from './library.api';

describe('LibraryApi', () => {
  it('serializes Unicode search filters and opaque cursors without dropping filter state', async () => {
    const get = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
    const api = new LibraryApi({ get });

    await api.listResources({
      q: 'từ điển',
      language: 'vi',
      type: 'VOCABULARY',
      topic: 'daily life',
      level: 'B1',
      cursor: 'opaque-cursor',
      limit: 20,
    });

    expect(get).toHaveBeenCalledWith(
      '/library/resources?q=t%E1%BB%AB+%C4%91i%E1%BB%83n&language=vi&type=VOCABULARY&topic=daily+life&level=B1&cursor=opaque-cursor&limit=20',
    );
  });

  it('encodes resource detail ids as path segments', async () => {
    const get = vi.fn().mockResolvedValue({ id: 'resource-1' });
    const api = new LibraryApi({ get });

    await expect(api.getResource('resource/1')).resolves.toEqual({ id: 'resource-1' });
    expect(get).toHaveBeenCalledWith('/library/resources/resource%2F1');
  });
});

it('serializes bounded anchor-related filters using the frozen relation query key', async () => {
  const get = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
  const api = new LibraryApi({ get });
  await api.getRelatedResources('resource/anchor', { language: 'vi', type: 'SENTENCE', level: 'A2', relation: 'FOLLOW_UP', cursor: 'opaque+/cursor', limit: 100 });
  expect(get).toHaveBeenCalledWith('/library/resources/resource%2Fanchor/related?language=vi&type=SENTENCE&level=A2&relation=FOLLOW_UP&cursor=opaque%2B%2Fcursor&limit=12');
});
