import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationFeed } from './NotificationFeed';
import type { NotificationStreamItem } from './notification.types';

afterEach(cleanup);

const unreadNotification: NotificationStreamItem = {
  id: 'f27cb06b-0133-4d0e-8f72-1c98a8c6624d',
  notificationType: 'COMMENT_REPLY',
  category: 'COMMUNITY',
  priority: 'NORMAL',
  actor: { kind: 'USER', displayName: 'Người học ẩn danh', profilePath: null },
  target: { kind: 'COMMUNITY_POST', path: '/community/posts/post-1' },
  variables: { subject: 'Trao đổi ngữ nghĩa' },
  createdAt: '2026-10-01T03:00:00.000Z',
  read: false,
  readAt: null,
};

const readNotification: NotificationStreamItem = {
  ...unreadNotification,
  id: 'a6d2b85e-802a-4d3a-99e0-1f0b4d652f34',
  notificationType: 'SECURITY_NOTICE',
  category: 'SECURITY',
  actor: { kind: 'SYSTEM', label: 'System' },
  target: null,
  read: true,
  readAt: '2026-10-01T03:01:00.000Z',
};

describe('NotificationFeed', () => {
  it('opens only a current canonical direct conversation without rendering forged private fields', async () => {
    const user = userEvent.setup(); const onMarkRead = vi.fn();
    render(<MemoryRouter><NotificationFeed onMarkRead={onMarkRead} items={[{
      ...unreadNotification, notificationType: 'DIRECT_MESSAGE', category: 'EXCHANGE',
      actor: { kind: 'SYSTEM', label: 'System' },
      target: { kind: 'DIRECT_CONVERSATION', path: '/exchange/conversations/11111111-1111-4111-8111-111111111111' },
      variables: { subject: 'Private subject', body: 'Private body', contextTitle: 'Private context' },
    }]} /></MemoryRouter>);
    expect(screen.getByText('Có tin nhắn riêng mới')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Private');
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/exchange/conversations/11111111-1111-4111-8111-111111111111');
    await user.click(link);
    expect(onMarkRead).toHaveBeenCalledExactlyOnceWith(unreadNotification.id);
  });

  it.each([null,
    { kind: 'DIRECT_CONVERSATION', path: '/exchange/conversations/11111111-1111-4111-8111-111111111111?token=private' },
    { kind: 'DIRECT_CONVERSATION', path: '/community/groups/private' },
    { kind: 'COMMUNITY_POST', path: '/exchange/conversations/11111111-1111-4111-8111-111111111111' },
  ])('does not offer navigation for an unavailable or forged direct-message target %j', target => {
    render(<MemoryRouter><NotificationFeed onMarkRead={vi.fn()} items={[{
      ...unreadNotification, notificationType: 'DIRECT_MESSAGE', actor: { kind: 'SYSTEM', label: 'System' }, target,
      variables: { subject: 'Private subject' },
    }]} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Thông báo trò chuyện không còn khả dụng')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Private');
  });

  it('masks a forged or hidden actor even when a direct-conversation path is present', () => {
    render(<MemoryRouter><NotificationFeed onMarkRead={vi.fn()} items={[{
      ...unreadNotification, notificationType: 'DIRECT_MESSAGE',
      actor: { kind: 'USER', displayName: 'Private actor', profilePath: '/profiles/private' },
      target: { kind: 'DIRECT_CONVERSATION', path: '/exchange/conversations/11111111-1111-4111-8111-111111111111' },
      variables: { subject: 'Private subject' },
    }]} /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Thông báo trò chuyện không còn khả dụng')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Private');
  });

  it('renders safe links and marks only unread notifications as read', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();

    render(
      <MemoryRouter>
        <NotificationFeed items={[unreadNotification, readNotification]} onMarkRead={onMarkRead} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/community/posts/post-1');
    expect(screen.queryByText('/community/posts/post-1')).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[1]).toBeDisabled();
    await user.click(buttons[0]);
    expect(onMarkRead).toHaveBeenCalledWith(unreadNotification.id);
  });

  it('provides an accessible empty state when the selected filter has no items', () => {
    render(
      <MemoryRouter>
        <NotificationFeed items={[]} onMarkRead={vi.fn()} emptyMessage='Không có cập nhật phù hợp.' />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Không có cập nhật phù hợp.');
    expect(screen.getByRole('status')).toHaveTextContent('Không có thông báo mới');
  });
});
