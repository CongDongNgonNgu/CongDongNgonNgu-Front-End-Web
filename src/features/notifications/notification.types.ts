export type NotificationScalar = string | number | boolean | null;

export type NotificationActor =
  | { kind: 'USER'; displayName: string; profilePath: string | null }
  | { kind: 'SYSTEM'; label: 'System' }
  | { kind: 'PROVIDER'; label: 'Service' }
  | { kind: 'DELETED'; label: 'Deleted member' };

export interface NotificationStreamItem {
  id: string;
  notificationType: string;
  category: string;
  priority: string;
  actor: NotificationActor;
  target: { kind: string; path: string | null } | null;
  variables: Record<string, NotificationScalar>;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}
