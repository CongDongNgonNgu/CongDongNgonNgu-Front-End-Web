import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../services/api-client';
import { useMessageThread } from './use-message-thread';
import type { DirectMessage, MessagingApiContract } from '../messaging.types';

const message = (sequence: string): DirectMessage => ({ id: 'message-' + sequence, conversationId: 'room',
  senderUserId: 'partner', sequence, clientMessageId: 'client-' + sequence,
  text: sequence, createdAt: '2026-10-10T00:00:00.000Z' });
const page = (sequences: string[], after = 'tail', next: string | null = null) => ({
  items: sequences.map(message), beforeCursor: 'older', afterCursor: after, nextCursor: next,
});
function api(): MessagingApiContract {
  return { open: vi.fn(), list: vi.fn(), send: vi.fn(), markRead: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ id: 'room', partner: { userId: 'partner', displayName: 'Partner' },
      headSequence: '1', changeVersion: '1', lastReadSequence: '0', unreadCount: '1', updatedAt: '2026-10-10T00:00:00.000Z' }),
    history: vi.fn().mockResolvedValue(page(['1'])),
  };
}
describe('owned message history and reconciliation', () => {
  it('loads the latest page then drains exclusive forward pages without duplicates', async () => {
    const source = api();
    const view = renderHook(() => useMessageThread(source, 'room', 'actor'));
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    vi.mocked(source.history).mockResolvedValueOnce(page(['2'], 'tail2', 'tail2'))
      .mockResolvedValueOnce(page(['3'], 'tail3'));
    await act(() => view.result.current.reconcile());
    expect(view.result.current.messages.map(item => item.sequence)).toEqual(['1', '2', '3']);
    expect(source.history).toHaveBeenNthCalledWith(2, 'room', { after: 'tail', limit: 50 }, expect.any(AbortSignal));
    expect(source.history).toHaveBeenNthCalledWith(3, 'room', { after: 'tail2', limit: 50 }, expect.any(AbortSignal));
  });
  it('coalesces hints while history is in flight and never overlaps protected reads', async () => {
    const source = api();
    const view = renderHook(() => useMessageThread(source, 'room', 'actor'));
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    let resolve!: (value: ReturnType<typeof page>) => void;
    vi.mocked(source.history).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = view.result.current.reconcile(); });
    await waitFor(() => expect(source.history).toHaveBeenCalledTimes(2));
    act(() => { second = view.result.current.reconcile(); });
    await act(async () => { resolve(page(['2'], 'tail2')); await Promise.all([first, second]); });
    expect(source.history).toHaveBeenCalledTimes(3);
    expect(view.result.current.messages.map(item => item.sequence)).toEqual(['1', '2']);
  });
  it('clears private state on protected denial and disables further actions until retry', async () => {
    const source = api();
    const view = renderHook(() => useMessageThread(source, 'room', 'actor'));
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    vi.mocked(source.get).mockRejectedValueOnce(new ApiClientError('Unavailable', 404, 'MESSAGE_UNAVAILABLE'));
    await act(() => view.result.current.reconcile());
    expect(view.result.current.messages).toEqual([]);
    expect(view.result.current.summary).toBeNull();
    expect(view.result.current.unavailable).toBe(true);
  });
  it('hides prior-actor data immediately and ignores late results after scope change', async () => {
    const source = api();
    const view = renderHook(({ actor }) => useMessageThread(source, 'room', actor), { initialProps: { actor: 'A' as string | undefined } });
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    let resolve!: (value: ReturnType<typeof page>) => void;
    vi.mocked(source.history).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    let request!: Promise<void>;
    act(() => { request = view.result.current.reconcile(); });
    await waitFor(() => expect(source.history).toHaveBeenCalledTimes(2));
    const signal = vi.mocked(source.history).mock.calls[1][2]!;
    view.rerender({ actor: undefined });
    expect(signal.aborted).toBe(true);
    expect(view.result.current.messages).toEqual([]);
    await act(async () => { resolve(page(['99'])); await request; });
    expect(view.result.current.messages).toEqual([]);
  });
  it('preserves catch-up gaps when a send response arrives ahead of missing messages', async () => {
    const source = api();
    const view = renderHook(() => useMessageThread(source, 'room', 'actor'));
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    act(() => view.result.current.acceptSent(message('3')));
    vi.mocked(source.history).mockResolvedValueOnce(page(['2', '3'], 'tail3'));
    await act(() => view.result.current.reconcile());
    expect(vi.mocked(source.history).mock.calls[1][1]).toEqual({ after: 'tail', limit: 50 });
    expect(view.result.current.messages.map(item => item.sequence)).toEqual(['1', '2', '3']);
  });
  it('rejects a nonprogressing catch-up cursor instead of polling endlessly', async () => {
    const source = api();
    const view = renderHook(() => useMessageThread(source, 'room', 'actor'));
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    vi.mocked(source.history).mockResolvedValueOnce(page([], 'tail', 'tail'));
    await act(() => view.result.current.reconcile());
    expect(view.result.current.error).toBe(true);
    expect(view.result.current.messages).toEqual([]);
    expect(source.history).toHaveBeenCalledTimes(2);
  });
  it('loads older history without rewinding the forward catch-up boundary', async () => {
    const source = api();
    vi.mocked(source.history).mockResolvedValueOnce(page(['3'], 'tail3', 'before3'));
    const view = renderHook(() => useMessageThread(source, 'room', 'actor'));
    await waitFor(() => expect(view.result.current.hasOlder).toBe(true));
    vi.mocked(source.history).mockResolvedValueOnce(page(['1', '2'], 'tail2'));
    await act(() => view.result.current.loadOlder());
    expect(view.result.current.messages.map(item => item.sequence)).toEqual(['1', '2', '3']);
    expect(view.result.current.hasOlder).toBe(false);
    vi.mocked(source.history).mockResolvedValueOnce(page(['4'], 'tail4'));
    await act(() => view.result.current.reconcile());
    expect(vi.mocked(source.history).mock.calls[2][1]).toEqual({ after: 'tail3', limit: 50 });
  });
  it('rejects callbacks from an earlier lifetime even after the same actor returns', async () => {
    const source = api();
    const view = renderHook(({ actor }) => useMessageThread(source, 'room', actor), { initialProps: { actor: 'A' } });
    await waitFor(() => expect(view.result.current.messages).toHaveLength(1));
    const oldAcceptSent = view.result.current.acceptSent;
    view.rerender({ actor: 'B' });
    await waitFor(() => expect(view.result.current.summary).not.toBeNull());
    view.rerender({ actor: 'A' });
    await waitFor(() => expect(view.result.current.summary).not.toBeNull());
    act(() => oldAcceptSent(message('99')));
    expect(view.result.current.messages.map(item => item.sequence)).toEqual(['1']);
  });
});
