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

export type NotificationStatus = 'ALL' | 'UNREAD';

export type NotificationCategory =
  | 'COMMUNITY'
  | 'CORRECTIONS'
  | 'EXCHANGE'
  | 'REPUTATION'
  | 'MEMBERSHIP'
  | 'SECURITY'
  | 'MODERATION'
  | 'SYSTEM';

export type NotificationDeliveryChannel = 'IN_APP' | 'SSE' | 'EMAIL' | 'PUSH';

export interface NotificationListResponse {
  readonly items: NotificationStreamItem[];
  readonly nextCursor: string | null;
  readonly unreadCount: number;
}

export interface NotificationReadResponse {
  readonly notificationId: string;
  readonly read: true;
  readonly readAt: string;
  readonly updatedAt: string;
}

export interface NotificationReadManyResponse {
  readonly updatedCount: number;
  readonly unreadCount: number;
}

export interface NotificationPreferenceItem {
  readonly category: NotificationCategory;
  readonly channel: NotificationDeliveryChannel;
  readonly enabled: boolean;
  readonly locked: boolean;
}
