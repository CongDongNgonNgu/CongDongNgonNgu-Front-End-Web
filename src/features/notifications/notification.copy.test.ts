import { describe, expect, it } from 'vitest';
import { getNotificationPresentation } from './notification.copy';
import type { NotificationStreamItem } from './notification.types';

const baseNotification: NotificationStreamItem = {
  id: 'f27cb06b-0133-4d0e-8f72-1c98a8c6624d',
  notificationType: 'SECURITY_NOTICE',
  category: 'SECURITY',
  priority: 'CRITICAL',
  actor: { kind: 'DELETED', label: 'Deleted member' },
  target: { kind: 'SYSTEM', path: '/internal/private-record' },
  variables: { subject: 'Phiên đăng nhập gần đây' },
  createdAt: '2026-10-01T03:00:00.000Z',
  read: false,
  readAt: null,
};

describe('notification presentation', () => {
  it('renders a safe learner-facing projection without raw paths or IDs', () => {
    const presentation = getNotificationPresentation(baseNotification);

    expect(presentation.actorLabel).toBe('Thành viên đã ẩn');
    expect(presentation.title).toBe('Thông báo bảo mật');
    expect(presentation.description).toContain('Thành viên đã ẩn');
    expect(presentation.description).not.toContain('/internal/private-record');
    expect(presentation.description).not.toContain(baseNotification.id);
  });
});
