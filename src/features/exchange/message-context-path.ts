import type { MessageContextCard } from './messaging.types';

export function messageContextPath(card: MessageContextCard | null | undefined): string | null {
  if (card?.availability !== 'AVAILABLE'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(card.id)) return null;
  const path = card.type === 'LIBRARY_RESOURCE' ? '/library/' + card.id
    : card.type === 'COMMUNITY_POST' ? '/community/posts/' + card.id : null;
  return path && card.canonicalPath === path ? path : null;
}
