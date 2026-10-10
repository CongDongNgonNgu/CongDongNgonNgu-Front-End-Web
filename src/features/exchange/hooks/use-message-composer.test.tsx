import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../services/api-client';
import type { DirectMessage, SendMessageInput } from '../messaging.types';
import { useMessageComposer } from './use-message-composer';

const response = (input: SendMessageInput): DirectMessage => ({ id: 'persisted', conversationId: 'room',
  senderUserId: 'A', sequence: '9007199254740993', ...input, text: input.text ?? '', createdAt: '2026-10-10T00:00:00.000Z' });

describe('owned idempotent message composer', () => {
  it('reuses the same client ID and normalized text after an ambiguous network failure', async () => {
    const send = vi.fn().mockRejectedValueOnce(new TypeError('Network failure'))
      .mockImplementationOnce(async (_id: string, input: SendMessageInput) => response(input));
    const onAccepted = vi.fn();
    const source = { send };
    const view = renderHook(() => useMessageComposer(source, 'room', 'A', true, onAccepted));
    act(() => view.result.current.setDraft('  e\u0301\nhello  '));
    await act(() => view.result.current.send());
    expect(view.result.current.error).toBe('failed');
    expect(view.result.current.draft).toBe('  e\u0301\nhello  ');
    await act(() => view.result.current.send());
    expect(send.mock.calls[0][1]).toEqual(send.mock.calls[1][1]);
    expect(send.mock.calls[0][1].text).toBe('é\nhello');
    expect(send.mock.calls[0][1].clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(onAccepted).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ sequence: '9007199254740993' }));
    expect(view.result.current.draft).toBe('');
  });
  it('does not duplicate a double click or erase edits made while the send is pending', async () => {
    let resolve!: (value: DirectMessage) => void;
    const send = vi.fn().mockImplementation(() => new Promise(done => { resolve = done; }));
    const source = { send };
    const view = renderHook(() => useMessageComposer(source, 'room', 'A', true, vi.fn()));
    act(() => view.result.current.setDraft('first'));
    let first!: Promise<boolean>;
    act(() => { first = view.result.current.send(); void view.result.current.send(); });
    expect(send).toHaveBeenCalledTimes(1);
    act(() => view.result.current.setDraft('next draft'));
    await act(async () => { resolve(response(send.mock.calls[0][1])); await first; });
    expect(view.result.current.draft).toBe('next draft');
    expect(view.result.current.sending).toBe(false);
  });
  it('allocates a fresh ID for changed normalized text after failure', async () => {
    const send = vi.fn().mockRejectedValue(new Error('network'));
    const source = { send };
    const view = renderHook(() => useMessageComposer(source, 'room', 'A', true, vi.fn()));
    act(() => view.result.current.setDraft('one'));
    await act(() => view.result.current.send());
    act(() => view.result.current.setDraft('two'));
    await act(() => view.result.current.send());
    expect(send.mock.calls[0][1].clientMessageId).not.toBe(send.mock.calls[1][1].clientMessageId);
  });
  it('aborts on scope change, clears private drafts and suppresses late success', async () => {
    let resolve!: (value: DirectMessage) => void;
    const send = vi.fn().mockImplementation(() => new Promise(done => { resolve = done; }));
    const onAccepted = vi.fn();
    const source = { send };
    const view = renderHook(({ actor }) => useMessageComposer(source, 'room', actor, true, onAccepted),
      { initialProps: { actor: 'A' as string | undefined } });
    act(() => view.result.current.setDraft('private draft'));
    let pending!: Promise<boolean>;
    act(() => { pending = view.result.current.send(); });
    const signal = send.mock.calls[0][2] as AbortSignal;
    view.rerender({ actor: undefined });
    expect(signal.aborted).toBe(true);
    expect(view.result.current.draft).toBe('');
    await act(async () => { resolve(response(send.mock.calls[0][1])); await pending; });
    expect(onAccepted).not.toHaveBeenCalled();
    expect(view.result.current.draft).toBe('');
  });
  it('rejects empty/overlong drafts locally and refuses sending while disabled', async () => {
    const send = vi.fn();
    const source = { send };
    const view = renderHook(({ enabled }) => useMessageComposer(source, 'room', 'A', enabled, vi.fn()),
      { initialProps: { enabled: true } });
    act(() => view.result.current.setDraft('🌏'.repeat(4001)));
    await act(() => view.result.current.send());
    expect(view.result.current.error).toBe('invalid');
    act(() => view.result.current.setDraft('hello'));
    view.rerender({ enabled: false });
    await act(() => view.result.current.send());
    expect(send).not.toHaveBeenCalled();
  });
  it.each([[429, 'rate-limited'], [403, 'unavailable']])('maps HTTP%s without exposing raw errors', async (status, error) => {
    const send = vi.fn().mockRejectedValue(new ApiClientError('raw private details', status as number, 'SYNTHETIC'));
    const source = { send };
    const view = renderHook(() => useMessageComposer(source, 'room', 'A', true, vi.fn()));
    act(() => view.result.current.setDraft('hello'));
    await act(() => view.result.current.send());
    expect(view.result.current.error).toBe(error);
  });
  it.each([
    { conversationId: 'other' }, { senderUserId: 'C' }, { clientMessageId: 'foreign-id' },
    { text: 'changed' }, { sequence: 9007199254740992 as unknown as string },
  ])('rejects an acknowledgement that conflicts with the attempt: %j', async patch => {
    const send = vi.fn().mockImplementationOnce(async (_id: string, input: SendMessageInput) => ({ ...response(input), ...patch }))
      .mockImplementationOnce(async (_id: string, input: SendMessageInput) => response(input));
    const source = { send };
    const onAccepted = vi.fn();
    const view = renderHook(() => useMessageComposer(source, 'room', 'A', true, onAccepted));
    act(() => view.result.current.setDraft('hello'));
    await act(() => view.result.current.send());
    expect(onAccepted).not.toHaveBeenCalled();
    expect(view.result.current.draft).toBe('hello');
    expect(view.result.current.error).toBe('failed');
    await act(() => view.result.current.send());
    expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
    expect(onAccepted).toHaveBeenCalledTimes(1);
  });
});
