import type { AuthApi } from '../auth/auth-api';
import { parseNotificationValue } from './notification-stream.client';
import type {
  NotificationCategory,
  NotificationDeliveryChannel,
  NotificationListResponse,
  NotificationPreferenceItem,
  NotificationReadManyResponse,
  NotificationReadResponse,
  NotificationStreamItem,
} from './notification.types';

type NotificationAuthTransport = Pick<AuthApi, 'requestProtected'>;

export interface ListNotificationsInput {
  readonly status?: 'ALL' | 'UNREAD';
  readonly cursor?: string;
  readonly limit?: number;
}

export interface NotificationPreferenceChange {
  readonly category: NotificationCategory;
  readonly channel: NotificationDeliveryChannel;
  readonly enabled: boolean;
}

export interface NotificationPreferencesResponse {
  readonly scope: 'own';
  readonly preferences: readonly NotificationPreferenceItem[];
}

export class NotificationApi {
  constructor(private readonly auth: NotificationAuthTransport) {}

  async list(input: ListNotificationsInput = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      limit: String(input.limit ?? 50),
      status: input.status ?? 'ALL',
    });
    if (input.cursor) params.set('cursor', input.cursor);
    const response = await this.auth.requestProtected<unknown>('/notifications?' + params.toString());
    return parseNotificationList(response);
  }

  async markRead(notificationId: string): Promise<NotificationReadResponse> {
    const response = await this.auth.requestProtected<unknown>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'POST' },
    );
    return parseNotificationReadResponse(response);
  }

  async markManyRead(notificationIds: readonly string[]): Promise<NotificationReadManyResponse> {
    if (notificationIds.length < 1 || notificationIds.length > 100 || notificationIds.some((id) => !isUuidV4(id))) {
      throw new Error('Notification ids are invalid.');
    }
    const response = await this.auth.requestProtected<unknown>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
    return parseNotificationReadManyResponse(response);
  }

  async getPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await this.auth.requestProtected<unknown>('/notifications/preferences');
    return parseNotificationPreferences(response);
  }

  async updatePreferences(
    preferences: readonly NotificationPreferenceChange[],
  ): Promise<NotificationPreferencesResponse> {
    const response = await this.auth.requestProtected<unknown>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferences }),
    });
    return parseNotificationPreferences(response);
  }
}

export function parseNotificationList(value: unknown): NotificationListResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !isNonNegativeInteger(value.unreadCount)) {
    throw new Error('Notification response is invalid.');
  }

  const items = value.items.map((item) => parseNotificationValue(item));
  if (items.some((item): item is undefined => item === undefined)) {
    throw new Error('Notification response is invalid.');
  }

  return {
    items: items as NotificationStreamItem[],
    nextCursor: value.nextCursor === null || typeof value.nextCursor === 'string' ? value.nextCursor : null,
    unreadCount: value.unreadCount,
  };
}

export function parseNotificationPreferences(value: unknown): NotificationPreferencesResponse {
  if (!isRecord(value) || value.scope !== 'own' || !Array.isArray(value.preferences)) {
    throw new Error('Notification preference response is invalid.');
  }

  const preferences = value.preferences.map((item) => parsePreference(item));
  if (preferences.some((item): item is undefined => item === undefined)) {
    throw new Error('Notification preference response is invalid.');
  }

  return { scope: 'own', preferences: preferences as NotificationPreferenceItem[] };
}

export function parseNotificationReadResponse(value: unknown): NotificationReadResponse {
  if (!isRecord(value)
    || !isUuidV4(value.notificationId)
    || value.read !== true
    || !isIsoTimestamp(value.readAt)
    || !isIsoTimestamp(value.updatedAt)) {
    throw new Error('Notification read response is invalid.');
  }
  return {
    notificationId: value.notificationId,
    read: true,
    readAt: value.readAt,
    updatedAt: value.updatedAt,
  };
}

export function parseNotificationReadManyResponse(value: unknown): NotificationReadManyResponse {
  if (!isRecord(value) || !isNonNegativeInteger(value.updatedCount) || !isNonNegativeInteger(value.unreadCount)) {
    throw new Error('Notification read response is invalid.');
  }
  return { updatedCount: value.updatedCount, unreadCount: value.unreadCount };
}

function parsePreference(value: unknown): NotificationPreferenceItem | undefined {
  if (!isRecord(value)) return undefined;
  if (!isCategory(value.category) || !isChannel(value.channel)) return undefined;
  if (typeof value.enabled !== 'boolean' || typeof value.locked !== 'boolean') return undefined;
  return {
    category: value.category,
    channel: value.channel,
    enabled: value.enabled,
    locked: value.locked,
  };
}

function isCategory(value: unknown): value is NotificationCategory {
  return typeof value === 'string' && [
    'COMMUNITY', 'CORRECTIONS', 'EXCHANGE', 'REPUTATION',
    'MEMBERSHIP', 'SECURITY', 'MODERATION', 'SYSTEM',
  ].includes(value);
}

function isChannel(value: unknown): value is NotificationDeliveryChannel {
  return typeof value === 'string' && ['IN_APP', 'SSE', 'EMAIL', 'PUSH'].includes(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createNotificationApi(auth: NotificationAuthTransport): NotificationApi {
  return new NotificationApi(auth);
}
