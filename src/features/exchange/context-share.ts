import { normalizeDraft } from './messaging-state';
import type { MessageContextType } from './messaging.types';

export interface ShareReference { type: MessageContextType; id: string }
export function normalizeShareNote(reference: ShareReference, note: string): string {
  if (!['LIBRARY_RESOURCE', 'COMMUNITY_POST'].includes(reference.type)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference.id))
    throw new Error('Invalid share reference');
  const normalized = note.normalize('NFC').trim();
  return normalized === '' ? '' : normalizeDraft(normalized);
}
