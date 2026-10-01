import { useEffect, useRef } from 'react';
import { NotificationStreamClient, parseNotification } from './notification-stream.client';
import type { NotificationStreamItem } from './notification.types';

export interface UseNotificationStreamOptions {
  onNotification: (notification: NotificationStreamItem) => void;
  onPoll: () => void;
  userScope?: string;
}

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 10_000;
const FALLBACK_POLL_INTERVAL_MS = 30_000;
const MAX_SEEN_EVENT_IDS = 256;

export function useNotificationStream(
  accessToken: string | undefined,
  { onNotification, onPoll, userScope }: UseNotificationStreamOptions,
): void {
  const onNotificationRef = useRef(onNotification);
  const onPollRef = useRef(onPoll);
  onNotificationRef.current = onNotification;
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    const client = new NotificationStreamClient();
    const seenEventIds = new Set<string>();
    let lastEventId: string | undefined;
    let retryDelay = INITIAL_RECONNECT_DELAY_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackPollTimer: ReturnType<typeof setInterval> | undefined;
    const broadcastChannel = createBroadcastChannel(userScope);

    const stopFallbackPolling = () => {
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
      fallbackPollTimer = undefined;
    };
    const startFallbackPolling = () => {
      if (fallbackPollTimer) return;
      onPollRef.current();
      fallbackPollTimer = setInterval(() => onPollRef.current(), FALLBACK_POLL_INTERVAL_MS);
    };
    const receiveNotification = (notification: NotificationStreamItem, broadcast: boolean) => {
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
      void client
        .connect({
          accessToken,
          lastEventId,
          onConnected: () => {
            retryDelay = INITIAL_RECONNECT_DELAY_MS;
            stopFallbackPolling();
          },
          onReplayUnavailable: startFallbackPolling,
          onNotification: (notification) => receiveNotification(notification, true),
          signal: controller.signal,
        })
        .catch(() => {
          if (controller.signal.aborted) return;
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
  }, [accessToken, userScope]);
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
