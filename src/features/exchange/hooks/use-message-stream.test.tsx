import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageStreamError, type MessageStreamOptions } from '../message-stream.client';
import { useMessageStream } from './use-message-stream';

afterEach(() => vi.useRealTimers());
const auth = () => ({ getAccessToken: vi.fn().mockReturnValue('synthetic-token'), refresh: vi.fn().mockResolvedValue({ id: 'A' }) });
const idle = () => new Promise<void>(() => undefined);
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }

describe('owned authenticated message reconnect lifecycle', () => {
  it('backs off 1/2/4/8 seconds then caps at15 instead of reconnecting every tick', async () => {
    vi.useFakeTimers();
    const connect = vi.fn().mockRejectedValue(new Error('offline'));
    const session = auth(), source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance(); expect(connect).toHaveBeenCalledTimes(1);
    for (const [ms, calls] of [[1000, 2], [2000, 3], [4000, 4], [8000, 5], [15000, 6], [15000, 7]]) {
      await advance(ms); expect(connect).toHaveBeenCalledTimes(calls);
    }
  });
  it('keeps authoritative REST reconciliation while SSE is healthy and coalesces concurrent hints', async () => {
    vi.useFakeTimers();
    let options!: MessageStreamOptions;
    const connect = vi.fn((next: MessageStreamOptions) => { options = next; next.onConnected?.(); return idle(); });
    const session = auth(), source = { connect };
    let resolve!: () => void;
    const reconcile = vi.fn().mockImplementationOnce(() => new Promise<void>(done => { resolve = done; })).mockResolvedValue(undefined);
    const view = renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance();
    expect(view.result.current).toBe('connected');
    act(() => { options.onHint('9007199254740993'); options.onHint('9007199254740993'); });
    expect(reconcile).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); await Promise.resolve(); });
    expect(reconcile).toHaveBeenCalledTimes(2);
    await advance(30_000);
    expect(reconcile).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenCalledTimes(1);
  });
  it('honors Retry-After and retains a validated route-scoped event ID on reconnect', async () => {
    vi.useFakeTimers();
    const connect = vi.fn().mockImplementationOnce((options: MessageStreamOptions) => {
      options.onConnected?.(); options.onHint('9007199254740993'); return Promise.reject(new MessageStreamError(429, 17));
    }).mockImplementation(idle);
    const session = auth(), source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance(16_999); expect(connect).toHaveBeenCalledTimes(1);
    await advance(1); expect(connect).toHaveBeenCalledTimes(2);
    expect(connect.mock.calls[1][0]).toMatchObject({ lastEventId: '9007199254740993', accessToken: 'synthetic-token' });
  });
  it('refreshes native auth once on401 and binds the new token to the original actor', async () => {
    vi.useFakeTimers();
    const session = auth();
    session.refresh.mockImplementation(async () => { session.getAccessToken.mockReturnValue('refreshed-token'); return { id: 'A' }; });
    const connect = vi.fn().mockRejectedValueOnce(new MessageStreamError(401)).mockImplementation(idle);
    const source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance();
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect.mock.calls[1][0].accessToken).toBe('refreshed-token');
  });
  it('stops instead of reconnecting with a different actor returned by refresh', async () => {
    vi.useFakeTimers();
    const session = auth(); session.refresh.mockResolvedValue({ id: 'B' });
    const connect = vi.fn().mockRejectedValue(new MessageStreamError(401));
    const source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    const view = renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance(60_000);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(view.result.current).toBe('unavailable');
  });
  it('does not loop refresh when the refreshed bearer is rejected again', async () => {
    vi.useFakeTimers();
    const session = auth(), connect = vi.fn().mockRejectedValue(new MessageStreamError(401));
    const source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    const view = renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance(60_000);
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(view.result.current).toBe('unavailable');
  });
  it('allows a later token refresh after a previous refreshed stream was accepted', async () => {
    vi.useFakeTimers();
    let reject!: (error: Error) => void;
    const connect = vi.fn().mockRejectedValueOnce(new MessageStreamError(401))
      .mockImplementationOnce((options: MessageStreamOptions) => {
        options.onConnected?.(); return new Promise<void>((_done, fail) => { reject = fail; });
      }).mockImplementation(idle);
    const session = auth(), source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance();
    expect(session.refresh).toHaveBeenCalledTimes(1);
    await advance(31_000);
    await act(async () => { reject(new MessageStreamError(401)); await Promise.resolve(); });
    expect(session.refresh).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenCalledTimes(3);
  });
  it('aborts and removes reconnect/REST timers on logout or unmount', async () => {
    vi.useFakeTimers();
    const connect = vi.fn().mockRejectedValue(new Error('offline'));
    const session = auth(), source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    const view = renderHook(({ actor }) => useMessageStream({ auth: session, client: source, conversationId: 'room', actor, enabled: true, onReconcile: reconcile }),
      { initialProps: { actor: 'A' as string | undefined } });
    await advance();
    const signal = connect.mock.calls[0][0].signal as AbortSignal;
    view.rerender({ actor: undefined });
    expect(signal.aborted).toBe(true);
    const polls = reconcile.mock.calls.length;
    await advance(60_000);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(polls);
    view.unmount();
  });
  it('does not reset short-lived reconnect backoff just because headers arrived', async () => {
    vi.useFakeTimers();
    const connect = vi.fn((options: MessageStreamOptions) => { options.onConnected?.(); return Promise.reject(new Error('closed')); });
    const session = auth(), source = { connect }, reconcile = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useMessageStream({ auth: session, client: source, conversationId: 'room', actor: 'A', enabled: true, onReconcile: reconcile }));
    await advance(1000); expect(connect).toHaveBeenCalledTimes(2);
    await advance(1999); expect(connect).toHaveBeenCalledTimes(2);
    await advance(1); expect(connect).toHaveBeenCalledTimes(3);
  });
});
