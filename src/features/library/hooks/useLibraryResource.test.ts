import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useLibraryResource } from './useLibraryResource';
import type { LibraryPublicResource } from '../library.types';
afterEach(cleanup);
it('discards obsolete anchor reads and completion after unmount', async () => {
  let old!: (resource: LibraryPublicResource) => void;
  let late!: (resource: LibraryPublicResource) => void;
  const api = { getResource: vi.fn().mockReturnValueOnce(new Promise<LibraryPublicResource>(resolve => { old = resolve; })).mockResolvedValueOnce({ id: 'current' }).mockReturnValueOnce(new Promise<LibraryPublicResource>(resolve => { late = resolve; })) };
  const { result, rerender, unmount } = renderHook(({ resourceId }) => useLibraryResource({ api, resourceId }), { initialProps: { resourceId: 'old' } });
  rerender({ resourceId: 'current' });
  await waitFor(() => expect(result.current.resource?.id).toBe('current'));
  await act(async () => { old({ id: 'old' } as LibraryPublicResource); });
  expect(result.current.resource?.id).toBe('current');
  act(() => { void result.current.refresh(); });
  expect(result.current.resource).toBeNull();
  unmount();
  await act(async () => { late({ id: 'late' } as LibraryPublicResource); });
});
