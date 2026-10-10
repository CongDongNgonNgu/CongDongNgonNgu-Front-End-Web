import { describe, expect, it, vi } from 'vitest';
import { MessageContextRefresh } from './message-context-refresh';
import type { MessageContextCard, MessageContextProjection } from './messaging.types';

const available: MessageContextCard = { availability: 'AVAILABLE', type: 'LIBRARY_RESOURCE',
  id: 'eb52692c-752c-4627-aa43-745927171d6a', category: 'VOCABULARY', languageCode: 'en',
  previewText: 'Current word', canonicalPath: '/library/eb52692c-752c-4627-aa43-745927171d6a' };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe('serialized current message-card refresh', () => {
  it('masks old and offscreen cards immediately, refreshes only visible cards and never restores on failure', async () => {
    const context = vi.fn(async (_room: string, messageId: string): Promise<MessageContextProjection> => ({ messageId, context: available }));
    const queue = new MessageContextRefresh({ context }, 'room');
    const first = vi.fn(), older = vi.fn();
    queue.watch('first', first); queue.watch('older', older);
    queue.visible('first', true); queue.visible('older', true); await flush();
    expect(first).toHaveBeenLastCalledWith(available);expect(older).toHaveBeenLastCalledWith(available);
    queue.visible('older', false);context.mockRejectedValueOnce(new Error('offline'));
    queue.invalidate();
    expect(first).toHaveBeenLastCalledWith(undefined);expect(older).toHaveBeenLastCalledWith(undefined);
    await flush();expect(first).toHaveBeenLastCalledWith(undefined);
    expect(context).toHaveBeenCalledTimes(3);
    context.mockImplementation(async (_room, messageId) => ({ messageId, context: { availability: 'UNAVAILABLE' } }));
    queue.visible('older', true);await flush();
    expect(older).toHaveBeenLastCalledWith({ availability: 'UNAVAILABLE' });queue.dispose();
  });

  it('serializes requests and ignores superseded refresh responses without starving queued cards', async () => {
    let resolve!: (value: MessageContextProjection) => void;
    const context = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockImplementation(async (_room: string, messageId: string) => ({ messageId, context: { availability: 'UNAVAILABLE' } }));
    const queue = new MessageContextRefresh({ context }, 'room');const a = vi.fn(), b = vi.fn();
    queue.watch('a', a);queue.watch('b', b);queue.visible('a', true);queue.visible('b', true);
    await flush();expect(context).toHaveBeenCalledTimes(1);queue.invalidate();
    resolve({ messageId: 'a', context: available });await flush();
    expect(context.mock.calls.map(call => call[1])).toEqual(['a', 'b', 'a']);
    expect(a).not.toHaveBeenCalledWith(available);expect(b).toHaveBeenLastCalledWith({ availability: 'UNAVAILABLE' });
    queue.dispose();
  });

  it('rechecks on open, fails closed on mismatched identity, and aborts disposed actor lifetime', async () => {
    const context = vi.fn().mockResolvedValueOnce({ messageId: 'a', context: available })
      .mockResolvedValueOnce({ messageId: 'a', context: { availability: 'UNAVAILABLE' } })
      .mockResolvedValueOnce({ messageId: 'other', context: available });
    const queue = new MessageContextRefresh({ context }, 'room');const sink = vi.fn();
    queue.watch('a', sink);queue.visible('a', true);await flush();
    expect(await queue.recheck('a')).toEqual({ availability: 'UNAVAILABLE' });
    expect(await queue.recheck('a')).toBeNull();expect(sink).toHaveBeenLastCalledWith(undefined);
    let resolve!: (value: MessageContextProjection) => void;
    context.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = queue.recheck('a');await flush();const signal = context.mock.calls.at(-1)![2] as AbortSignal;
    queue.dispose();expect(signal.aborted).toBe(true);resolve({ messageId: 'a', context: available });
    expect(await pending).toBeNull();expect(sink).toHaveBeenLastCalledWith(undefined);
  });

  it('keeps a click waiting for its fresh request when an older refresh is still in flight', async () => {
    let resolve!: (value: MessageContextProjection) => void;
    const context = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockResolvedValue({ messageId: 'a', context: { availability: 'UNAVAILABLE' } });
    const queue = new MessageContextRefresh({ context }, 'room');queue.watch('a', vi.fn());queue.visible('a', true);
    const opened = queue.recheck('a');resolve({ messageId: 'a', context: available });
    expect(await opened).toEqual({ availability: 'UNAVAILABLE' });
    expect(context).toHaveBeenCalledTimes(2);queue.dispose();
  });

  it('settles a queued click with null when its card becomes offscreen', async () => {
    let resolve!: (value: MessageContextProjection) => void;
    const context = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const queue = new MessageContextRefresh({ context }, 'room');
    queue.watch('a', vi.fn());queue.watch('b', vi.fn());queue.visible('a', true);
    let settled = false;
    const opened = queue.recheck('b').then(card => { settled = true;return card; });
    queue.visible('b', false);resolve({ messageId: 'a', context: available });await flush();
    expect(settled).toBe(true);expect(await opened).toBeNull();
    expect(context.mock.calls.map(call => call[1])).not.toContain('b');queue.dispose();
  });
});
