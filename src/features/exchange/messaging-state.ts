import type { DirectMessage } from './messaging.types';

export function parseMessageSequence(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(value)) throw new Error('Invalid message sequence');
  const sequence = BigInt(value);
  if (sequence > 9223372036854775807n) throw new Error('Invalid message sequence');
  return sequence;
}

export function normalizeDraft(input: string): string {
  const text = input.normalize('NFC').trim();
  if (!text || /[\u0000\uD800-\uDFFF]/u.test(text) || [...text].length > 4000)
    throw new Error('Message text must contain 1 to 4000 Unicode code points');
  return text;
}

// Immutable persisted messages may arrive repeatedly through send/history/catch-up.
// Reject conflicting projections rather than displaying uncertain private data.
export function mergeMessages(conversationId: string, previous: readonly DirectMessage[], incoming: readonly DirectMessage[]): DirectMessage[] {
  const byId = new Map<string, DirectMessage>();
  const bySequence = new Map<string, string>();
  for (const message of [...previous, ...incoming]) {
    if (message.conversationId !== conversationId || parseMessageSequence(message.sequence) === 0n)
      throw new Error('Message does not belong to this conversation');
    const sameSequenceId = bySequence.get(message.sequence);
    const existing = byId.get(message.id);
    if ((sameSequenceId && sameSequenceId !== message.id) || (existing && (
      existing.sequence !== message.sequence || existing.senderUserId !== message.senderUserId ||
      existing.clientMessageId !== message.clientMessageId || existing.text !== message.text ||
      existing.createdAt !== message.createdAt
    ))) throw new Error('Conflicting message identity');
    bySequence.set(message.sequence, message.id);
    byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) => {
    const first = parseMessageSequence(a.sequence), second = parseMessageSequence(b.sequence);
    return first === second ? 0 : first < second ? -1 : 1;
  });
}
