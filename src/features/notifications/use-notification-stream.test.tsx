import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStream } from './use-notification-stream';
import type { NotificationStreamItem } from './notification.types';

const connect = vi.hoisted(() => vi.fn());

vi.mock('./notification-stream.client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./notification-stream.client')>();
  return {
    ...actual,
    NotificationStreamClient: class {
      connect = connect;
    },
  };
});

const notification: NotificationStreamItem = {
  id: 'f27cb06b-0133-4d0e-8f72-1c98a8c6624d',
  notificationType: 'COMMENT_REPLY',
  category: 'COMMUNITY',
  priority: 'NORMAL',
  actor: { kind: 'SYSTEM', label: 'System' },
  target: null,
  variables: {},
  createdAt: '2026-10-01T03:00:00.000Z',
  read: false,
  readAt: null,
};

class TestBroadcastChannel {
  static channels = new Map<string, Set<TestBroadcastChannel>>();
  readonly name: string;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  closed = false;

  constructor(name: string) {
    this.name = name;
    const channels = TestBroadcastChannel.channels.get(name) ?? new Set<TestBroadcastChannel>();
    channels.add(this);
    TestBroadcastChannel.channels.set(name, channels);
  }

  postMessage(data: unknown): void {
    for (const channel of TestBroadcastChannel.channels.get(this.name) ?? []) {
      if (channel !== this && !channel.closed) channel.onmessage?.({ data } as MessageEvent<unknown>);
    }
  }

  close(): void {
    this.closed = true;
    TestBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  TestBroadcastChannel.channels.clear();
  vi.unstubAllGlobals();
});

describe('useNotificationStream', () => {
  it('falls back to polling with bounded reconnect backoff and cleans up on unmount', async () => {
    vi.useFakeTimers();
    connect
      .mockRejectedValueOnce(new Error('stream unavailable'))
      .mockImplementation(() => new Promise<void>(() => undefined));
    const onPoll = vi.fn();
    const { unmount } = renderHook(() =>
      useNotificationStream('access-token', { onNotification: vi.fn(), onPoll, userScope: 'user-a' }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onPoll).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('deduplicates a safe notification broadcast across tabs scoped to the same user', () => {
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    connect.mockImplementation(() => new Promise<void>(() => undefined));
    const firstReceived: NotificationStreamItem[] = [];
    const secondReceived: NotificationStreamItem[] = [];

    const first = renderHook(() => useNotificationStream('access-token', {
      onNotification: (event) => firstReceived.push(event),
      onPoll: vi.fn(),
      userScope: 'user-a',
    }));
    const second = renderHook(() => useNotificationStream('access-token', {
      onNotification: (event) => secondReceived.push(event),
      onPoll: vi.fn(),
      userScope: 'user-a',
    }));
    const sender = new TestBroadcastChannel('cdn-notifications-v1-user-a');

    act(() => sender.postMessage({ type: 'notification', notification }));
    act(() => sender.postMessage({ type: 'notification', notification }));

    expect(firstReceived).toEqual([notification]);
    expect(secondReceived).toEqual([notification]);
    first.unmount();
    second.unmount();
    sender.close();
  });

  it('does not create a cross-user broadcast channel when no user scope is supplied', () => {
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    connect.mockImplementation(() => new Promise<void>(() => undefined));

    const { unmount } = renderHook(() => useNotificationStream('access-token', {
      onNotification: vi.fn(),
      onPoll: vi.fn(),
    }));

    expect(TestBroadcastChannel.channels.size).toBe(0);
    unmount();
  });
});
