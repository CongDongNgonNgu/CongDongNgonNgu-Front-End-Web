import { resolveApiBaseUrl } from '../../services/api-client';
import type { NotificationStreamItem } from './notification.types';

type StreamFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface NotificationStreamConnectionOptions {
  accessToken: string;
  lastEventId?: string;
  onConnected?: () => void;
  onReplayUnavailable?: () => void;
  onNotification: (notification: NotificationStreamItem) => void;
  signal: AbortSignal;
}

export class NotificationStreamClient {
  private readonly baseUrl: string;
  private readonly fetcher: StreamFetcher;

  constructor(
    fetcher: StreamFetcher = globalThis.fetch.bind(globalThis),
    baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  ) {
    this.fetcher = fetcher;
    this.baseUrl = baseUrl;
  }

  async connect(options: NotificationStreamConnectionOptions): Promise<void> {
    if (!options.accessToken) throw new Error('Notification stream requires an authenticated session.');

    const response = await this.fetcher(
      `${this.baseUrl.replace(/\/+$/, '')}/notifications/stream`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${options.accessToken}`,
          ...(options.lastEventId ? { 'Last-Event-ID': options.lastEventId } : {}),
        },
        signal: options.signal,
      },
    );

    if (
      !response.ok ||
      !response.body ||
      !response.headers.get('Content-Type')?.toLowerCase().includes('text/event-stream')
    ) {
      throw new Error('Notification stream is unavailable.');
    }

    options.onConnected?.();
    await consumeEventStream(response.body, options);
    if (!options.signal.aborted) throw new Error('Notification stream closed.');
  }
}

async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  options: NotificationStreamConnectionOptions,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      blocks.forEach((block) => processEventBlock(block, options));
    }

    buffer += decoder.decode().replace(/\r\n/g, '\n');
    if (buffer) processEventBlock(buffer, options);
  } finally {
    reader.releaseLock();
  }
}

function processEventBlock(block: string, options: NotificationStreamConnectionOptions): void {
  const fields = block.split('\n').reduce<Record<string, string[]>>((result, line) => {
    if (!line || line.startsWith(':')) return result;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return result;

    const name = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1).replace(/^ /, '');
    result[name] = [...(result[name] ?? []), value];
    return result;
  }, {});

  const eventType = fields.event?.[0];
  const data = fields.data?.join('\n');
  if (!eventType || data === undefined) return;

  if (eventType === 'replay-unavailable') {
    try {
      const value = JSON.parse(data) as { fallback?: unknown };
      if (value && value.fallback === 'POLL_NOTIFICATIONS') options.onReplayUnavailable?.();
    } catch {
      // Ignore malformed control events; the normal polling fallback remains available.
    }
    return;
  }

  if (eventType !== 'notification') return;
  const notification = parseNotification(data);
  if (!notification || !fields.id?.[0] || fields.id[0] !== notification.id) return;
  options.onNotification(notification);
}

export function parseNotification(value: string): NotificationStreamItem | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return undefined;
    if (
      !isUuidV4(parsed.id) ||
      !isBoundedString(parsed.notificationType, 80) ||
      !isBoundedString(parsed.category, 40) ||
      !isBoundedString(parsed.priority, 20) ||
      !isNotificationActor(parsed.actor) ||
      !isNotificationTarget(parsed.target) ||
      !isNotificationVariables(parsed.variables) ||
      !isIsoTimestamp(parsed.createdAt) ||
      typeof parsed.read !== 'boolean' ||
      (parsed.readAt !== null && !isIsoTimestamp(parsed.readAt)) ||
      (!parsed.read && parsed.readAt !== null) ||
      (parsed.read && parsed.readAt === null)
    ) return undefined;

    return {
      id: parsed.id,
      notificationType: parsed.notificationType,
      category: parsed.category,
      priority: parsed.priority,
      actor: parsed.actor,
      target: parsed.target,
      variables: parsed.variables,
      createdAt: parsed.createdAt,
      read: parsed.read,
      readAt: parsed.readAt,
    };
  } catch {
    return undefined;
  }
}

function isNotificationActor(value: unknown): value is NotificationStreamItem['actor'] {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'USER') {
    return isBoundedString(value.displayName, 120) && (value.profilePath === null || isBoundedString(value.profilePath, 240));
  }
  return (
    (value.kind === 'SYSTEM' && value.label === 'System') ||
    (value.kind === 'PROVIDER' && value.label === 'Service') ||
    (value.kind === 'DELETED' && value.label === 'Deleted member')
  );
}

function isNotificationTarget(value: unknown): value is NotificationStreamItem['target'] {
  if (value === null) return true;
  return isRecord(value) && isBoundedString(value.kind, 60) && (value.path === null || isSafePath(value.path));
}

function isNotificationVariables(value: unknown): value is Record<string, NotificationStreamItem['variables'][string]> {
  if (!isRecord(value) || Object.keys(value).length > 20) return false;
  return Object.entries(value).every(([key, item]) => (
    /^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(key) &&
    !/(?:password|secret|token|credential|authorization|cookie|webhook|raw|stack|trace)/iu.test(key) &&
    isScalar(item)
  ));
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isSafeInteger(value)) || (typeof value === 'string' && value.length <= 512);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\u0000-\u001F\u007F]/u.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && new Date(value).toISOString() === value;
}

function isSafePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && isBoundedString(value, 240);
}

function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
