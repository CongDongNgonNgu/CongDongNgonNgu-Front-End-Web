import { describe, expect, it } from 'vitest';
import { mergeMessages, normalizeDraft, parseMessageSequence } from './messaging-state';
import type { DirectMessage } from './messaging.types';

const message = (id: string, sequence: string, conversationId = 'room'): DirectMessage => ({
  id, sequence, conversationId, senderUserId: 'actor', clientMessageId: 'client-' + id,
  text: 'hello', createdAt: '2026-10-10T00:00:00.000Z',
});
describe('message reconciliation', () => {
  it('deduplicates retries/history and orders exact bigint sequences without rounding', () => {
    const older = message('a', '9007199254740992');
    const newer = message('b', '9007199254740993');
    const result = mergeMessages('room', [newer], [older, newer]);
    expect(result.map(item => item.id)).toEqual(['a', 'b']);
    expect(result[1].sequence).toBe('9007199254740993');
  });
  it('fails closed on a foreign conversation or conflicting immutable identity', () => {
    expect(() => mergeMessages('room', [], [message('a', '1', 'other')])).toThrow();
    expect(() => mergeMessages('room', [message('a', '1')], [message('b', '1')])).toThrow();
    expect(() => mergeMessages('room', [message('a', '1')], [message('a', '2')])).toThrow();
    expect(() => mergeMessages('room', [message('a', '1')], [{ ...message('a', '1'), text: 'changed' }])).toThrow();
  });
  it.each(['01', '-1', '1.5', '9223372036854775808'])('rejects invalid sequence %s', value => {
    expect(() => parseMessageSequence(value)).toThrow();
  });
  it('rejects numeric JSON sequences before a rounded number can enter reconciliation', () => {
    const numericSequence = 9007199254740992 as unknown as string;
    expect(() => parseMessageSequence(numericSequence)).toThrow();
    expect(() => mergeMessages('room', [], [message('numeric', numericSequence)])).toThrow();
  });
  it('accepts canonical zero/version bounds and immutable replay without altering inputs', () => {
    expect(parseMessageSequence('0')).toBe(0n);
    expect(parseMessageSequence('9223372036854775807')).toBe(9223372036854775807n);
    const existing = Object.freeze([Object.freeze(message('a', '1'))]);
    expect(mergeMessages('room', existing, [message('a', '1')])).toEqual(existing);
  });
});
describe('composer Unicode boundary', () => {
  it('normalizes NFC, trims edges, preserves internal whitespace and counts astral code points', () => {
    expect(normalizeDraft('  e\u0301\n  Việt  ')).toBe('é\n  Việt');
    expect(normalizeDraft(' 🌏'.trim().repeat(4000))).toHaveLength(8000);
  });
  it.each(['  ', '\u0000', '\uD800', '🌏'.repeat(4001)])('rejects empty, invalid or overlong text', text => {
    expect(() => normalizeDraft(text)).toThrow();
  });
});
