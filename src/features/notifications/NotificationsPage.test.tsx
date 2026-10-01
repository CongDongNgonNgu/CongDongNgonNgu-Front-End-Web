import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import type { AuthApi } from '../auth/auth-api';
import { NotificationCenterProvider } from './NotificationCenterProvider';
import { NotificationsPage } from './NotificationsPage';

vi.mock('./use-notification-stream', () => ({
  useNotificationStream: vi.fn(),
}));

afterEach(cleanup);

const notifications = [
  {
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
  },
  {
    id: 'a6d2b85e-802a-4d3a-99e0-1f0b4d652f34',
    notificationType: 'SECURITY_NOTICE',
    category: 'SECURITY',
    priority: 'CRITICAL',
    actor: { kind: 'SYSTEM', label: 'System' },
    target: null,
    variables: {},
    createdAt: '2026-10-01T02:00:00.000Z',
    read: true,
    readAt: '2026-10-01T02:01:00.000Z',
  },
];

function createAuthenticatedApi(): AuthApi {
  return {
    bootstrap: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'learner@example.test',
      displayName: 'Người học',
      status: 'ACTIVE',
      emailVerified: true,
      roles: ['LEARNER'],
    }),
    getProviders: vi.fn().mockResolvedValue({ providers: [] }),
    getAccessToken: vi.fn().mockReturnValue('access-token'),
    requestProtected: vi.fn((path: string) => {
      if (path.startsWith('/notifications?')) return Promise.resolve({ items: notifications, nextCursor: null, unreadCount: 1 });
      if (path === '/notifications/preferences') {
        return Promise.resolve({
          scope: 'own',
          preferences: [
            { category: 'COMMUNITY', channel: 'IN_APP', enabled: true, locked: false },
            { category: 'SECURITY', channel: 'IN_APP', enabled: true, locked: true },
          ],
        });
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  } as unknown as AuthApi;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider api={createAuthenticatedApi()}>
        <NotificationCenterProvider>
          <NotificationsPage />
        </NotificationCenterProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('NotificationsPage', () => {
  it('filters by category and keeps preference controls owner-scoped', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Có phản hồi mới')).toBeVisible());
    expect(screen.getByRole('heading', { name: 'Thông báo' })).toBeVisible();

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[7]);
    expect(screen.getByText('Thông báo bảo mật')).toBeVisible();
    expect(screen.queryByText('Có phản hồi mới')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tùy chọn/ }));
    const dialog = screen.getByRole('dialog', { name: 'Tùy chọn thông báo' });
    expect(dialog).toBeVisible();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox')[1]).toBeDisabled();
  });
});
