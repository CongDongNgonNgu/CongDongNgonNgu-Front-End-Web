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
  it.each(['vi', 'en'] as const)('renders generic direct-message copy in %s without private variables', locale => {
    const copy = getNotificationPresentation({ ...baseNotification, notificationType: 'DIRECT_MESSAGE', category: 'EXCHANGE',
      actor: { kind: 'SYSTEM', label: 'System' },
      target: { kind: 'DIRECT_CONVERSATION', path: '/exchange/conversations/11111111-1111-4111-8111-111111111111' },
      variables: { subject: 'Private subject', body: 'Private body', contextTitle: 'Private context' } }, locale);
    expect(copy.title).toBe(locale === 'en' ? 'New direct message' : 'Có tin nhắn riêng mới');
    expect(copy.targetLabel).toBe(locale === 'en' ? 'Open conversation' : 'Mở cuộc trò chuyện');
    expect(JSON.stringify(copy)).not.toMatch(/Private|11111111/u);
  });

  it.each(['vi', 'en'] as const)('redacts unavailable direct-message copy in %s including forged actors', locale => {
    const copy = getNotificationPresentation({ ...baseNotification, notificationType: 'DIRECT_MESSAGE',
      actor: { kind: 'USER', displayName: 'Private actor', profilePath: '/profiles/private' },
      target: null, variables: { subject: 'Private subject' } }, locale);
    expect(copy.title).toBe(locale === 'en' ? 'Conversation notification unavailable' : 'Thông báo trò chuyện không còn khả dụng');
    expect(copy.targetLabel).toBeNull();
    expect(JSON.stringify(copy)).not.toContain('Private');
  });

  it.each(['vi', 'en'] as const)('distinguishes requested and accepted connections in %s without saved subjects', locale => {
    const item: NotificationStreamItem = { ...baseNotification, category: 'EXCHANGE',
      notificationType: 'BUDDY_REQUEST', actor: { kind: 'USER', displayName: 'Current learner', profilePath: null },
      target: { kind: 'EXCHANGE_CONNECTION', path: '/exchange/connections' }, variables: { subject: 'Stale private text' } };
    const requested = getNotificationPresentation(item, locale);
    const connected = getNotificationPresentation({ ...item, notificationType: 'BUDDY_CONNECTED' }, locale);
    expect(requested.title).toBe(locale === 'en' ? 'New study connection request' : 'Có yêu cầu kết nối học tập');
    expect(connected.title).toBe(locale === 'en' ? 'Study connection accepted' : 'Kết nối học tập đã được chấp nhận');
    expect(connected.description).toContain('Current learner');
    expect(requested.description + connected.description).not.toContain('Stale private text');
  });

  it.each(['BUDDY_REQUEST', 'BUDDY_CONNECTED'])('uses generic unavailable copy for a redacted %s', notificationType => {
    const copy = getNotificationPresentation({ ...baseNotification, notificationType, category: 'EXCHANGE', target: null }, 'en');
    expect(copy.title).toBe('Connection notification unavailable');
    expect(copy.description).not.toContain('Phiên đăng nhập');
    expect(copy.targetLabel).toBeNull();
  });

  it('renders a safe learner-facing projection without raw paths or IDs', () => {
    const presentation = getNotificationPresentation(baseNotification);

    expect(presentation.actorLabel).toBe('Thành viên đã ẩn');
    expect(presentation.title).toBe('Thông báo bảo mật');
    expect(presentation.description).toContain('Thành viên đã ẩn');
    expect(presentation.description).not.toContain('/internal/private-record');
    expect(presentation.description).not.toContain(baseNotification.id);
  });
});
