import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../services/api-client';
import type { DirectMessage, SendMessageInput } from '../messaging.types';
import { useContextShare, type ContextShareApi } from './use-context-share';

const reference = { type: 'LIBRARY_RESOURCE' as const, id: 'eb52692c-752c-4627-aa43-745927171d6a' };
const partner = { connectionId: 'pair', targetUserId: 'B', displayName: 'Partner B', state: 'CONNECTED' as const, updatedAt: '2026-10-10T00:00:00Z' };
function fixture() {
  const listConnections = vi.fn<ContextShareApi['listConnections']>().mockResolvedValue({ items: [partner], nextCursor: null });
  const open = vi.fn<ContextShareApi['open']>().mockResolvedValue({ id: 'room', partner: { userId: 'B', displayName: 'Partner B' },
    headSequence: '0', changeVersion: '0', lastReadSequence: '0', unreadCount: '0', updatedAt: partner.updatedAt });
  const response = (input: SendMessageInput): DirectMessage => ({ id: 'message', conversationId: 'room', senderUserId: 'A',
    sequence: '1', text: input.text ?? '', clientMessageId: input.clientMessageId, createdAt: partner.updatedAt,
    context: { availability: 'UNAVAILABLE' } });
  const send = vi.fn<ContextShareApi['send']>().mockImplementation(async (_id, input) => response(input));
  return { api: { listConnections, open, send }, response };
}
describe('context share dialog lifecycle', () => {
  it('canonicalizes uppercase UUID references and accepts the canonical available acknowledgement', async () => {
    const { api, response } = fixture();api.send.mockImplementation(async (_room, input) => ({ ...response(input), context: {
      availability: 'AVAILABLE', type: reference.type, id: reference.id, category: 'SENTENCE', languageCode: 'en',
      previewText: 'Sentence', canonicalPath: '/library/' + reference.id,
    } }));
    const upper = { ...reference, id: reference.id.toUpperCase() };
    const view = renderHook(() => useContextShare(api, 'A', upper));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));act(() => view.result.current.select('B'));
    await act(() => view.result.current.submit());
    expect(api.send.mock.calls[0][1].contextId).toBe(reference.id);expect(view.result.current.conversationId).toBe('room');
  });
  it('rejects a malformed availability acknowledgement without losing retry identity', async () => {
    const { api, response } = fixture();api.send.mockImplementationOnce(async (_room, input) => ({ ...response(input),
      context: { availability: 'UNKNOWN' } as unknown as DirectMessage['context'],
    }));
    const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));act(() => view.result.current.select('B'));
    await act(() => view.result.current.submit());expect(view.result.current.conversationId).toBeNull();expect(view.result.current.error).toBe('failed');
    await act(() => view.result.current.submit());expect(api.send.mock.calls[1][1]).toEqual(api.send.mock.calls[0][1]);
    expect(view.result.current.conversationId).toBe('room');
  });
  it('scans empty connected pages, deduplicates partners and submits context-only without snapshots', async () => {
    const { api } = fixture();
    api.listConnections.mockResolvedValueOnce({ items: [], nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [partner, partner, { ...partner, connectionId: 'pending', state: 'OUTGOING_PENDING' }], nextCursor: null });
    const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.cursor).toBe('next'));
    await act(() => view.result.current.loadMore());
    expect(api.listConnections.mock.calls.map(([input]) => input)).toEqual([
      { kind: 'CONNECTED', limit: 20 }, { kind: 'CONNECTED', limit: 20, cursor: 'next' },
    ]);
    expect(view.result.current.partners).toEqual([partner]);
    act(() => view.result.current.select('B'));
    await act(() => view.result.current.submit());
    expect(api.send.mock.calls[0][1]).toEqual({ clientMessageId: expect.any(String), text: '', contextType: reference.type, contextId: reference.id });
    expect(view.result.current.conversationId).toBe('room');
    await act(() => view.result.current.submit());
    expect(api.send).toHaveBeenCalledTimes(1);
  });
  it('retains the complete retry identity, but changes it for changed normalized note or partner', async () => {
    const { api } = fixture();api.send.mockRejectedValue(new Error('network'));
    api.listConnections.mockResolvedValue({ items: [partner, { ...partner, connectionId: 'pairC', targetUserId: 'C' }], nextCursor: null });
    api.open.mockImplementation(async id => ({ id: 'room', partner: { userId: id, displayName: id },
      headSequence: '0', changeVersion: '0', lastReadSequence: '0', unreadCount: '0', updatedAt: partner.updatedAt }));
    const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(2));
    act(() => { view.result.current.select('B');view.result.current.setNote(' e\u0301 '); });
    await act(() => view.result.current.submit());await act(() => view.result.current.submit());
    expect(api.send.mock.calls[0][1]).toEqual(api.send.mock.calls[1][1]);
    expect(api.send.mock.calls[0][1].text).toBe('é');
    act(() => view.result.current.setNote('new note'));await act(() => view.result.current.submit());
    expect(api.send.mock.calls[2][1].clientMessageId).not.toBe(api.send.mock.calls[1][1].clientMessageId);
    act(() => view.result.current.select('C'));await act(() => view.result.current.submit());
    expect(api.send.mock.calls[3][1].clientMessageId).not.toBe(api.send.mock.calls[2][1].clientMessageId);
  });
  it('aborts old ownership and ignores an A/B/A late success and double submit', async () => {
    const { api, response } = fixture();let resolve!: (value: DirectMessage) => void;
    api.send.mockImplementation(() => new Promise(done => { resolve = done; }));
    const view = renderHook(({ actor }) => useContextShare(api, actor, reference), { initialProps: { actor: 'A' } });
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));
    act(() => view.result.current.select('B'));
    let pending!: Promise<void>;act(() => { pending = view.result.current.submit();void view.result.current.submit(); });
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(1));
    const input = api.send.mock.calls[0][1], signal = api.send.mock.calls[0][2]!;
    view.rerender({ actor: 'B' });view.rerender({ actor: 'A' });
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(response(input));await pending; });
    expect(view.result.current.conversationId).toBeNull();expect(view.result.current.selected).toBe('');
  });
  it('rejects invalid notes and unlisted partners before opening, and maps access errors generically', async () => {
    const { api } = fixture();const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));
    act(() => view.result.current.select('foreign'));await act(() => view.result.current.submit());
    expect(api.open).not.toHaveBeenCalled();
    act(() => { view.result.current.select('B');view.result.current.setNote('🌏'.repeat(4001)); });
    await act(() => view.result.current.submit());expect(view.result.current.error).toBe('invalid');expect(api.open).not.toHaveBeenCalled();
    act(() => view.result.current.setNote('note'));api.open.mockRejectedValue(new ApiClientError('private details', 404, 'PAIR_UNAVAILABLE'));
    await act(() => view.result.current.submit());expect(view.result.current.error).toBe('unavailable');
  });
  it('rejects mismatched open/send acknowledgements and retains the attempt for a safe retry', async () => {
    const { api, response } = fixture();api.send.mockImplementationOnce(async (_id, input) => ({ ...response(input), senderUserId: 'C' }));
    const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));act(() => view.result.current.select('B'));
    await act(() => view.result.current.submit());expect(view.result.current.error).toBe('failed');expect(view.result.current.conversationId).toBeNull();
    await act(() => view.result.current.submit());expect(api.send.mock.calls[1][1]).toEqual(api.send.mock.calls[0][1]);
    expect(view.result.current.conversationId).toBe('room');
  });
  it('does not expose a late connection page from an earlier actor lifetime', async () => {
    const { api } = fixture();let resolve!: (page: Awaited<ReturnType<ContextShareApi['listConnections']>>) => void;
    api.listConnections.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const view = renderHook(({ actor }) => useContextShare(api, actor, reference), { initialProps: { actor: 'A' as string | undefined } });
    view.rerender({ actor: undefined });
    await act(async () => resolve({ items: [partner], nextCursor: 'private-cursor' }));
    expect(view.result.current.partners).toEqual([]);expect(view.result.current.cursor).toBeNull();
    await act(() => view.result.current.submit());expect(api.open).not.toHaveBeenCalled();
  });
  it('refuses an open response for the wrong partner and never sends into that room', async () => {
    const { api } = fixture();const summary = await api.open('B');api.open.mockResolvedValue({ ...summary, partner: { userId: 'C', displayName: 'Wrong partner' } });
    const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));act(() => view.result.current.select('B'));
    await act(() => view.result.current.submit());expect(api.send).not.toHaveBeenCalled();expect(view.result.current.error).toBe('failed');
  });
  it.each(['\u0000', '\ud800'])('rejects an unsafe optional note %j before transport', async note => {
    const { api } = fixture();const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));
    act(() => { view.result.current.select('B');view.result.current.setNote(note); });
    await act(() => view.result.current.submit());expect(api.open).not.toHaveBeenCalled();expect(view.result.current.error).toBe('invalid');
  });
  it('keeps retry identity and partner selection after a rate limit without exposing error text', async () => {
    const { api } = fixture();api.send.mockRejectedValueOnce(new ApiClientError('private internals', 429, 'SEND_MINUTE'));
    const view = renderHook(() => useContextShare(api, 'A', reference));
    await waitFor(() => expect(view.result.current.partners).toHaveLength(1));act(() => view.result.current.select('B'));
    await act(() => view.result.current.submit());expect(view.result.current.error).toBe('rate-limited');expect(view.result.current.selected).toBe('B');
    await act(() => view.result.current.submit());expect(api.send.mock.calls[1][1]).toEqual(api.send.mock.calls[0][1]);
    expect(view.result.current.conversationId).toBe('room');
  });
});
