import { describe, expect, it, vi } from 'vitest';
import { NotificationStreamClient, parseNotification } from './notification-stream.client';
import type { NotificationStreamItem } from './notification.types';

const notification: NotificationStreamItem = {
  id: 'f27cb06b-0133-4d0e-8f72-1c98a8c6624d',
  notificationType: 'COMMENT_REPLY',
  category: 'COMMUNITY',
  priority: 'NORMAL',
  actor: { kind: 'USER', displayName: 'Notification Actor', profilePath: '/profiles/actor' },
  target: { kind: 'COMMUNITY_POST', path: '/community/posts/post' },
  variables: { commentPreview: 'A bounded comment preview' },
  createdAt: '2026-10-01T03:00:00.000Z',
  read: false,
  readAt: null,
};

function streamResponse(payload: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(payload));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }, status: 200 },
  );
}

describe('NotificationStreamClient', () => {
  it('sends bearer authentication and Last-Event-ID without putting credentials in the URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      streamResponse(`id: ${notification.id}\nevent: notification\ndata: ${JSON.stringify(notification)}\n\n`),
    );
    const received: NotificationStreamItem[] = [];

    await expect(
      new NotificationStreamClient(fetcher, '/api/v1').connect({
        accessToken: 'access-token',
        lastEventId: '13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa',
        onNotification: (event) => received.push(event),
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('Notification stream closed.');

    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/notifications/stream',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
          Authorization: 'Bearer access-token',
          'Last-Event-ID': '13aa8a9b-8fe5-4ec0-9ac8-b6f2a2ad29aa',
        }),
      }),
    );
    expect(received).toEqual([notification]);
  });

  it('ignores mismatched identifiers, malformed payloads and private variable keys', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      streamResponse(
        `id: unrelated-id\nevent: notification\ndata: ${JSON.stringify(notification)}\n\n` +
        `id: ${notification.id}\nevent: notification\ndata: {"id":"${notification.id}","notificationType":"COMMENT_REPLY","category":"COMMUNITY","priority":"NORMAL","actor":{"kind":"SYSTEM","label":"System"},"target":null,"variables":{"accessToken":"secret"},"createdAt":"2026-10-01T03:00:00.000Z","read":false,"readAt":null}\n\n`,
      ),
    );
    const received: NotificationStreamItem[] = [];

    await new NotificationStreamClient(fetcher, '/api/v1')
      .connect({ accessToken: 'access-token', onNotification: (event) => received.push(event), signal: new AbortController().signal })
      .catch(() => undefined);

    expect(received).toEqual([]);
  });

  it('accepts the safe projection while dropping internal fields from the returned object', () => {
    const parsed = parseNotification(JSON.stringify({
      ...notification,
      recipientUserId: '11111111-1111-4111-8111-111111111111',
      sourceEventId: '22222222-2222-4222-8222-222222222222',
      deliveryAttempts: [{ token: 'do-not-render' }],
    }));

    expect(parsed).toEqual(notification);
    expect(parsed).not.toHaveProperty('recipientUserId');
    expect(parsed).not.toHaveProperty('sourceEventId');
    expect(parsed).not.toHaveProperty('deliveryAttempts');
  });
});
