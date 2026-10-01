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
