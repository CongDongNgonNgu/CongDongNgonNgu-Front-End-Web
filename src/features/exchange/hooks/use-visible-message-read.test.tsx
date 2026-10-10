import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVisibleMessageRead } from './use-visible-message-read';

afterEach(() => vi.restoreAllMocks());
function visible() {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
}
describe('visible history-confirmed read marker', () => {
  it('marks only a focused visible thread at the latest confirmed history position', async () => {
    visible();
    const markRead = vi.fn().mockResolvedValue(undefined), source = { markRead }, onFailure = vi.fn();
    const view = renderHook(({ atLatest }) => useVisibleMessageRead({ api: source, conversationId: 'room', actor: 'A',
      sequence: '9007199254740993', lastRead: '0', atLatest, enabled: true, onFailure }), { initialProps: { atLatest: false } });
    expect(markRead).not.toHaveBeenCalled();
    view.rerender({ atLatest: true });
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(1));
    expect(markRead).toHaveBeenCalledWith('room', '9007199254740993', expect.any(AbortSignal));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(markRead).toHaveBeenCalledTimes(1);
  });
  it('waits for visibility and focus, and skips positions already acknowledged', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const markRead = vi.fn().mockResolvedValue(undefined), source = { markRead }, onFailure = vi.fn();
    renderHook(() => useVisibleMessageRead({ api: source, conversationId: 'room', actor: 'A', sequence: '2', lastRead: '1', atLatest: true, enabled: true, onFailure }));
    expect(markRead).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(markRead).not.toHaveBeenCalled();
    focus.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(1));
  });
  it('serializes advancement while a previous read update is pending', async () => {
    visible();
    let resolve!: () => void;
    const markRead = vi.fn().mockImplementationOnce(() => new Promise<void>(done => { resolve = done; })).mockResolvedValue(undefined);
    const source = { markRead }, onFailure = vi.fn();
    const view = renderHook(({ sequence }) => useVisibleMessageRead({ api: source, conversationId: 'room', actor: 'A',
      sequence, lastRead: '0', atLatest: true, enabled: true, onFailure }), { initialProps: { sequence: '1' } });
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(1));
    view.rerender({ sequence: '2' });
    expect(markRead).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); await Promise.resolve(); });
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(2));
    expect(markRead.mock.calls[1][1]).toBe('2');
  });
  it('aborts on actor loss and ignores late failures from the old scope', async () => {
    visible();
    let reject!: (error: Error) => void;
    const markRead = vi.fn().mockImplementation(() => new Promise<void>((_done, fail) => { reject = fail; }));
    const source = { markRead }, onFailure = vi.fn();
    const view = renderHook(({ actor }) => useVisibleMessageRead({ api: source, conversationId: 'room', actor, sequence: '1', lastRead: '0', atLatest: true, enabled: true, onFailure }),
      { initialProps: { actor: 'A' as string | undefined } });
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(1));
    const signal = markRead.mock.calls[0][2] as AbortSignal;
    view.rerender({ actor: undefined });
    expect(signal.aborted).toBe(true);
    await act(async () => { reject(new Error('late')); await Promise.resolve(); });
    expect(onFailure).not.toHaveBeenCalled();
  });
  it('reports an active protected failure once without spinning', async () => {
    visible();
    const markRead = vi.fn().mockRejectedValue(new Error('denied')), source = { markRead }, onFailure = vi.fn();
    renderHook(() => useVisibleMessageRead({ api: source, conversationId: 'room', actor: 'A', sequence: '1', lastRead: '0', atLatest: true, enabled: true, onFailure }));
    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(1));
    expect(markRead).toHaveBeenCalledTimes(1);
  });
});
