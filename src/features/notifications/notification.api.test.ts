import { describe, expect, it, vi } from 'vitest';
import { NotificationApi } from './notification.api';

const notification = {
  id: 'f27cb06b-0133-4d0e-8f72-1c98a8c6624d',
  notificationType: 'COMMENT_REPLY',
  category: 'COMMUNITY',
  priority: 'NORMAL',
  actor: { kind: 'SYSTEM', label: 'System' },
  target: { kind: 'COMMUNITY_POST', path: '/community/posts/post-1' },
  variables: { subject: 'Trao đổi ngữ nghĩa' },
  createdAt: '2026-10-01T03:00:00.000Z',
  read: false,
  readAt: null,
};

describe('NotificationApi', () => {
  it('reads the owner-scoped list through the protected transport and validates the safe projection', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ items: [notification], nextCursor: null, unreadCount: 1 });
    const api = new NotificationApi({ requestProtected });

    await expect(api.list({ status: 'UNREAD', limit: 20 })).resolves.toEqual({
      items: [notification],
      nextCursor: null,
      unreadCount: 1,
    });
    expect(requestProtected).toHaveBeenCalledWith('/notifications?limit=20&status=UNREAD');
  });

  it('rejects malformed notification projections instead of rendering untrusted payloads', async () => {
    const requestProtected = vi.fn().mockResolvedValue({
      items: [{ ...notification, variables: { rawPayload: '{secret}' } }],
      nextCursor: null,
      unreadCount: 1,
    });
    const api = new NotificationApi({ requestProtected });

    await expect(api.list()).rejects.toThrow('Notification response is invalid.');
  });

  it('uses the protected CSRF-aware transport for read state and preferences mutations', async () => {
    const requestProtected = vi
      .fn()
      .mockResolvedValueOnce({ notificationId: notification.id, read: true, readAt: '2026-10-01T03:01:00.000Z', updatedAt: '2026-10-01T03:01:00.000Z' })
      .mockResolvedValueOnce({ updatedCount: 1, unreadCount: 0 })
      .mockResolvedValueOnce({ scope: 'own', preferences: [{ category: 'COMMUNITY', channel: 'IN_APP', enabled: true, locked: false }] });
    const api = new NotificationApi({ requestProtected });

    await api.markRead(notification.id);
    await api.markManyRead([notification.id]);
    await api.updatePreferences([{ category: 'COMMUNITY', channel: 'IN_APP', enabled: true }]);

    expect(requestProtected).toHaveBeenNthCalledWith(1, `/notifications/${notification.id}/read`, { method: 'POST' });
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/notifications/read', expect.objectContaining({ method: 'POST', body: JSON.stringify({ notificationIds: [notification.id] }) }));
    expect(requestProtected).toHaveBeenNthCalledWith(3, '/notifications/preferences', expect.objectContaining({ method: 'PATCH' }));
  });

  it('rejects invalid read-state inputs and malformed mutation responses', async () => {
    const requestProtected = vi.fn().mockResolvedValue({
      notificationId: notification.id,
      read: true,
      readAt: 'not-a-timestamp',
      updatedAt: '2026-10-01T03:01:00.000Z',
    });
    const api = new NotificationApi({ requestProtected });

    await expect(api.markRead(notification.id)).rejects.toThrow('Notification read response is invalid.');
    await expect(api.markManyRead([])).rejects.toThrow('Notification ids are invalid.');
    expect(requestProtected).toHaveBeenCalledTimes(1);
  });
});
