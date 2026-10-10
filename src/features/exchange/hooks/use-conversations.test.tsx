import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useConversations } from './use-conversations';
import type { DirectConversationPage, DirectConversationSummary } from '../messaging.types';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const item: DirectConversationSummary = { id: 'room', partner: { userId: 'B', displayName: 'Partner' },
  headSequence: '0', changeVersion: '0', lastReadSequence: '0', unreadCount: '0', updatedAt: '2026-10-10T00:00:00Z' };
const page: DirectConversationPage = { items: [item], nextCursor: null };
describe('owned conversation list', () => {
  it('rechecks a queued refresh and suppresses the superseded private response', async () => {
    let finish!: (value: DirectConversationPage) => void;
    const api = { list: vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue({ items: [], nextCursor: null }) };
    const { result } = renderHook(() => useConversations(api, 'A'));
    await act(async () => { void result.current.refresh(); });
    await act(async () => { finish(page); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual([]);
  });
  it('discards a late private response after switching accounts', async () => {
    let finish!: (value: DirectConversationPage) => void;
    const api = { list: vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue({ items: [], nextCursor: null }) };
    const { result, rerender } = renderHook(({ actor }) => useConversations(api, actor), { initialProps: { actor: 'A' } });
    const signal = api.list.mock.calls[0][1] as AbortSignal;
    rerender({ actor: 'C' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { finish(page); });
    expect(signal.aborted).toBe(true);
    expect(result.current.items).toEqual([]);
  });
  it('clears previously visible private data when a focus refresh is denied', async () => {
    const api = { list: vi.fn().mockResolvedValueOnce(page).mockRejectedValueOnce(new Error('denied')) };
    const { result } = renderHook(() => useConversations(api, 'A'));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.items).toEqual([]);
    expect(result.current.cursor).toBeNull();
  });
  it('refreshes after thirty seconds and releases its timer on unmount', async () => {
    vi.useFakeTimers();
    const api = { list: vi.fn().mockResolvedValue(page) };
    const { unmount } = renderHook(() => useConversations(api, 'A'));
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(api.list).toHaveBeenCalledTimes(2);
    unmount();
    await act(async () => { vi.advanceTimersByTime(60_000); window.dispatchEvent(new Event('focus')); });
    expect(api.list).toHaveBeenCalledTimes(2);
  });
});
