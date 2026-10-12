import type { DirectConversationNotificationTarget, NotificationStreamItem } from './notification.types';

// Current authorization is projected by the server; a client target never grants access.
// Direct notices accept only the exact canonical route, with no query, hash or extra segment.
export function getDirectConversationNotificationTarget(
  item: Pick<NotificationStreamItem, 'actor' | 'target'>,
): DirectConversationNotificationTarget | null {
  const target = item.target;
  if (item.actor.kind !== 'SYSTEM' || target?.kind !== 'DIRECT_CONVERSATION'
    || typeof target.path !== 'string'
    || !/^\/exchange\/conversations\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(target.path)) return null;
  return { kind: 'DIRECT_CONVERSATION', path: target.path };
}

export function getNotificationTargetPath(item: NotificationStreamItem): string | null {
  return item.notificationType === 'DIRECT_MESSAGE'
    ? getDirectConversationNotificationTarget(item)?.path ?? null
    : item.target?.path ?? null;
}
