import { useEffect, useMemo, useRef } from 'react';
import { NotificationStreamClient, parseNotification } from './notification-stream.client';
import type { NotificationStreamItem } from './notification.types';

export interface UseNotificationStreamOptions {
  onNotification: (notification: NotificationStreamItem) => void;
  onPoll: () => void | Promise<void>;
  userScope?: string;
  onStatusChange?: (status: NotificationStreamStatus) => void;
}

export type NotificationStreamStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 10_000;
const FALLBACK_POLL_INTERVAL_MS = 30_000;
const MAX_SEEN_EVENT_IDS = 256;

export function useNotificationStream(
  accessToken: string | undefined,
  options: UseNotificationStreamOptions,
): void {
  const { onNotification, onPoll, userScope } = options;
  const ownership = useMemo(() => ({ accessToken, userScope }), [accessToken, userScope]);
  const currentOwnership = useRef(ownership);
  currentOwnership.current = ownership;
  const onNotificationRef = useRef(onNotification);
  const onPollRef = useRef(onPoll);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onNotificationRef.current = onNotification;
  onPollRef.current = onPoll;
  onStatusChangeRef.current = options.onStatusChange;

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    const client = new NotificationStreamClient();
    const seenEventIds = new Set<string>();
    let lastEventId: string | undefined;
    let retryDelay = INITIAL_RECONNECT_DELAY_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackPollTimer: ReturnType<typeof setInterval> | undefined;
    let polling = false;
    const broadcastChannel = createBroadcastChannel(userScope);

    const stopFallbackPolling = () => {
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
      fallbackPollTimer = undefined;
    };
    const startFallbackPolling = () => {
      if (fallbackPollTimer) return;
      const poll = () => {
        if (controller.signal.aborted || currentOwnership.current !== ownership || polling) return;
        polling = true;
        void Promise.resolve().then(() => {
          if (!controller.signal.aborted && currentOwnership.current === ownership) return onPollRef.current();
        }).catch(() => undefined).finally(() => { polling = false; });
      };
      poll();
      fallbackPollTimer = setInterval(poll, FALLBACK_POLL_INTERVAL_MS);
    };
    const receiveNotification = (notification: NotificationStreamItem, broadcast: boolean) => {
      if (controller.signal.aborted || currentOwnership.current !== ownership) return;
      if (seenEventIds.has(notification.id)) return;
      seenEventIds.add(notification.id);
      if (seenEventIds.size > MAX_SEEN_EVENT_IDS) {
        const oldest = seenEventIds.values().next().value as string | undefined;
        if (oldest) seenEventIds.delete(oldest);
      }
      lastEventId = notification.id;
      onNotificationRef.current(notification);
      if (broadcast) broadcastChannel?.postMessage({ type: 'notification', notification });
    };

    if (broadcastChannel) {
      broadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
        if (!isBroadcastNotification(event.data)) return;
        const notification = parseNotification(JSON.stringify(event.data.notification));
        if (notification) receiveNotification(notification, false);
      };
    }

    const connect = () => {
      onStatusChangeRef.current?.(lastEventId ? 'reconnecting' : 'connecting');
      void client
        .connect({
          accessToken,
          lastEventId,
          onConnected: () => {
            if (controller.signal.aborted || currentOwnership.current !== ownership) return;
            retryDelay = INITIAL_RECONNECT_DELAY_MS;
            // Another replica may persist notices while this stream remains
            // healthy. Keep bounded authoritative reconciliation active.
            startFallbackPolling();
            onStatusChangeRef.current?.('connected');
          },
          onReplayUnavailable: () => {
            if (controller.signal.aborted || currentOwnership.current !== ownership) return;
            onStatusChangeRef.current?.('reconnecting');
            startFallbackPolling();
          },
          onNotification: (notification) => receiveNotification(notification, true),
          signal: controller.signal,
        })
        .catch(() => {
          if (controller.signal.aborted || currentOwnership.current !== ownership) return;
          onStatusChangeRef.current?.('offline');
          startFallbackPolling();
          reconnectTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RECONNECT_DELAY_MS);
        });
    };

    connect();
    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopFallbackPolling();
      broadcastChannel?.close();
    };
  }, [accessToken, userScope, ownership]);
}

function createBroadcastChannel(userScope: string | undefined): BroadcastChannel | undefined {
  if (!userScope || typeof globalThis.BroadcastChannel === 'undefined') return undefined;
  return new globalThis.BroadcastChannel(`cdn-notifications-v1-${encodeURIComponent(userScope)}`);
}

function isBroadcastNotification(
  value: unknown,
): value is { type: 'notification'; notification: NotificationStreamItem } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const message = value as { type?: unknown; notification?: unknown };
  return message.type === 'notification' && typeof message.notification === 'object' && message.notification !== null;
}
