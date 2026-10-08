import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLibraryRelatedResources } from './useLibraryRelatedResources';
import type { LibraryRelatedPage, LibraryPublicResource } from '../library.types';

const resource = (id: string): LibraryPublicResource => ({
  id, resourceType: 'SENTENCE', primaryLanguageCode: 'vi', secondaryLanguageCode: null,
  cefrLevel: 'A1', topics: [], reviewState: 'VERIFIED', details: { resourceType: 'SENTENCE', text: id, context: null },
  provenance: [{ sourceType: 'ORIGINAL_AUTHOR', sourceId: 'test-only-author', sourceUrl: null, originalAuthorReference: null,
    attribution: 'Test-only contributor', license: { licenseKey: 'CC-BY-4.0', displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true, redistributionAllowed: true, derivativeConstraints: null } }],
  createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z',
});
const page = (id: string, nextCursor: string | null = null): LibraryRelatedPage => ({
  items: [{ resource: resource(id), relation: { type: 'SAME_CONCEPT' } }], nextCursor,
});
const deferred = () => {
  let resolve!: (value: LibraryRelatedPage) => void;
  const promise = new Promise<LibraryRelatedPage>(done => { resolve = done; });
  return { promise, resolve };
};
afterEach(cleanup);

describe('bounded related resources freshness', () => {
  it('replaces prior page cards and clears them before requesting the next cursor page', async () => {
    const next = deferred();
    const api = { getRelatedResources: vi.fn().mockResolvedValueOnce(page('first', 'opaque-next')).mockReturnValueOnce(next.promise) };
    const { result } = renderHook(() => useLibraryRelatedResources({ api, resourceId: 'anchor', filters: {} }));
    await waitFor(() => expect(result.current.items[0]?.resource.id).toBe('first'));
    act(() => { void result.current.nextPage(); });
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    await act(async () => { next.resolve(page('second')); });
    expect(result.current.items.map(item => item.resource.id)).toEqual(['second']);
    expect(api.getRelatedResources).toHaveBeenLastCalledWith('anchor', { limit: 3, cursor: 'opaque-next' });
  });

  it('discards obsolete filter responses and does not show old anchor payloads', async () => {
    const stale = deferred();
    const api = { getRelatedResources: vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValueOnce(page('current')).mockResolvedValueOnce(page('new-anchor-target')) };
    const { result, rerender } = renderHook(({ resourceId, language }) => useLibraryRelatedResources({ api, resourceId, filters: { language } }), { initialProps: { resourceId: 'anchor', language: '' } });
    rerender({ resourceId: 'anchor', language: 'vi' });
    await waitFor(() => expect(result.current.items[0]?.resource.id).toBe('current'));
    await act(async () => { stale.resolve(page('stale')); });
    expect(result.current.items[0]?.resource.id).toBe('current');
    rerender({ resourceId: 'another-anchor', language: 'vi' });
    expect(result.current.items).toEqual([]);
    await waitFor(() => expect(result.current.items[0]?.resource.id).toBe('new-anchor-target'));
  });

  it('allows explicit continuation from empty bounded scans, then clears payload on refresh failure', async () => {
    const api = { getRelatedResources: vi.fn().mockResolvedValueOnce({ items: [], nextCursor: 'continue' }).mockResolvedValueOnce(page('eligible')).mockRejectedValueOnce(new Error('offline internal details')) };
    const { result } = renderHook(() => useLibraryRelatedResources({ api, resourceId: 'anchor', filters: {} }));
    await waitFor(() => expect(result.current.nextCursor).toBe('continue'));
    await act(async () => { await result.current.nextPage(); });
    expect(result.current.items[0]?.resource.id).toBe('eligible');
    await act(async () => { await result.current.refresh(); });
    expect(result.current.items).toEqual([]);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('clears existing cards and refreshes on return focus without a persistent cache', async () => {
    const refreshed = deferred();
    const api = { getRelatedResources: vi.fn().mockResolvedValueOnce(page('old')).mockReturnValueOnce(refreshed.promise) };
    const { result } = renderHook(() => useLibraryRelatedResources({ api, resourceId: 'anchor', filters: {} }));
    await waitFor(() => expect(result.current.items[0]?.resource.id).toBe('old'));
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(result.current.items).toEqual([]);
    await act(async () => { refreshed.resolve({ items: [], nextCursor: null }); });
    expect(result.current.items).toEqual([]);
  });
});

it('does not allow duplicate next-page requests or keep a non-progressing cursor', async () => {
  const next = deferred();
  const api = { getRelatedResources: vi.fn().mockResolvedValueOnce(page('first', 'same-cursor')).mockReturnValueOnce(next.promise) };
  const { result } = renderHook(() => useLibraryRelatedResources({ api, resourceId: 'anchor', filters: {} }));
  await waitFor(() => expect(result.current.nextCursor).toBe('same-cursor'));
  act(() => { void result.current.nextPage(); void result.current.nextPage(); });
  expect(api.getRelatedResources).toHaveBeenCalledTimes(2);
  await act(async () => { next.resolve(page('second', 'same-cursor')); });
  expect(result.current.nextCursor).toBeNull();
});

it('discards a next-page response after starting over', async () => {
  const obsoletePage = deferred();
  const api = { getRelatedResources: vi.fn().mockResolvedValueOnce(page('first', 'next')).mockReturnValueOnce(obsoletePage.promise).mockResolvedValueOnce(page('fresh-start')) };
  const { result } = renderHook(() => useLibraryRelatedResources({ api, resourceId: 'anchor', filters: {} }));
  await waitFor(() => expect(result.current.nextCursor).toBe('next'));
  act(() => { void result.current.nextPage(); });
  await act(async () => { await result.current.refresh(); });
  await act(async () => { obsoletePage.resolve(page('obsolete-page')); });
  expect(result.current.items.map(item => item.resource.id)).toEqual(['fresh-start']);
});

it('refreshes on visible return and ignores completion after unmount', async () => {
  const returned = deferred();
  const api = { getRelatedResources: vi.fn().mockResolvedValueOnce(page('initial')).mockReturnValueOnce(returned.promise) };
  const { result, unmount } = renderHook(() => useLibraryRelatedResources({ api, resourceId: 'anchor', filters: {} }));
  await waitFor(() => expect(result.current.items[0]?.resource.id).toBe('initial'));
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(result.current.items).toEqual([]);
  unmount();
  await act(async () => { returned.resolve(page('obsolete')); });
  expect(api.getRelatedResources).toHaveBeenCalledTimes(2);
});
