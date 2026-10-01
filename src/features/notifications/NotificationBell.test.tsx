import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import type { AuthApi } from '../auth/auth-api';
import { NotificationBell } from './NotificationBell';
import { NotificationCenterProvider } from './NotificationCenterProvider';

vi.mock('./use-notification-stream', () => ({
  useNotificationStream: vi.fn(),
}));

afterEach(cleanup);

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
      if (path.startsWith('/notifications?')) return Promise.resolve({ items: [notification], nextCursor: null, unreadCount: 1 });
      if (path === '/notifications/preferences') return Promise.resolve({ scope: 'own', preferences: [] });
      throw new Error(`Unexpected request: ${path}`);
    }),
  } as unknown as AuthApi;
}

function renderBell() {
  return render(
    <MemoryRouter>
      <AuthProvider api={createAuthenticatedApi()}>
        <NotificationCenterProvider>
          <NotificationBell />
        </NotificationCenterProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  it('supports opening, Escape close, outside close, and focus return', async () => {
    const user = userEvent.setup();
    renderBell();

    const trigger = await screen.findByRole('button', { name: /Thông báo/ });
    await waitFor(() => expect(trigger).toHaveAccessibleName(/1 chưa đọc/));
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Thông báo' })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Thông báo' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Thông báo' })).toBeVisible();
    await user.click(document.body);
    expect(screen.queryByRole('dialog', { name: 'Thông báo' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
