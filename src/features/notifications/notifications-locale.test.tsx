import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UiLocaleProvider, useUiLocale } from '../ui-locale/UiLocaleProvider';
import { NotificationCenterProvider } from './NotificationCenterProvider';
import { NotificationBell } from './NotificationBell';
import { NotificationsPage } from './NotificationsPage';
import type { UseNotificationStreamOptions } from './use-notification-stream';

const fixture = vi.hoisted(() => ({ list: vi.fn(), preferences: vi.fn(), markRead: vi.fn(), updatePreferences: vi.fn(), stream: null as UseNotificationStreamOptions | null }));
const authApi = { getAccessToken: () => 'synthetic-token' };
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ api: authApi, status: 'authenticated', user: { id: 'actor' } }) }));
vi.mock('./notification.api', () => ({ createNotificationApi: () => ({ list: fixture.list, getPreferences: fixture.preferences,
  markRead: fixture.markRead, updatePreferences: fixture.updatePreferences }) }));
vi.mock('./use-notification-stream', () => ({ useNotificationStream: (_token: string, options: UseNotificationStreamOptions) => { fixture.stream = options; } }));

const notice = { id: '11111111-1111-4111-8111-111111111111', notificationType: 'DIRECT_MESSAGE', category: 'EXCHANGE',
  priority: 'NORMAL', actor: { kind: 'SYSTEM' as const, label: 'System' as const },
  target: { kind: 'DIRECT_CONVERSATION', path: '/exchange/conversations/22222222-2222-4222-8222-222222222222' },
  variables: {}, createdAt: '2026-10-01T03:00:00.000Z', read: false, readAt: null };

function Switch() {
  const { setLocale } = useUiLocale();
  return <><button onClick={() => setLocale('en')}>English</button><button onClick={() => setLocale('vi')}>Vietnamese</button></>;
}
function mount(children: React.ReactNode) {
  return render(<MemoryRouter><UiLocaleProvider><NotificationCenterProvider><Switch />{children}</NotificationCenterProvider></UiLocaleProvider></MemoryRouter>);
}
beforeEach(() => {
  window.localStorage.clear();
  fixture.list.mockResolvedValue({ items: [notice], nextCursor: null, unreadCount: 1 });
  fixture.preferences.mockResolvedValue({ scope: 'own', preferences: [
    { category: 'EXCHANGE', channel: 'SSE', enabled: true, locked: false },
    { category: 'SECURITY', channel: 'IN_APP', enabled: true, locked: true },
  ] });
  fixture.markRead.mockRejectedValue(new Error('Private infrastructure failure'));
  fixture.updatePreferences.mockRejectedValue(new Error('Private infrastructure failure'));
});
afterEach(() => { cleanup(); vi.resetAllMocks(); window.localStorage.clear(); });

describe('notification chrome locale switching', () => {
  it('switches direct-message metadata, page controls, preferences and existing errors without reloading account data', async () => {
    const user = userEvent.setup(); mount(<NotificationsPage />);
    await screen.findByText('Có tin nhắn riêng mới');
    const calls = fixture.list.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Unread (1)' })).toBeInTheDocument();
    expect(screen.getByText('Earlier')).toBeInTheDocument();
    expect(screen.getByText('Unread', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark notification as read' }));
    await screen.findByText('Could not update notification status.');
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    const dialog = screen.getByRole('dialog', { name: 'Notification preferences' });
    expect(within(dialog).getByLabelText('Study connections · Live updates')).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: /Security · In app.*Required/u })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Save preferences' }));
    await within(dialog).findByText('Could not save preferences. Please try again.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Vietnamese' }));
    expect(screen.getByRole('heading', { name: 'Thông báo' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể lưu tùy chọn thông báo.');
    expect(fixture.list).toHaveBeenCalledTimes(calls);
  });

  it('localizes bell controls, offline status, empty state and accessible labels', async () => {
    fixture.list.mockResolvedValue({ items: [], nextCursor: null, unreadCount: 0 });
    const user = userEvent.setup(); mount(<NotificationBell />);
    await waitFor(() => expect(fixture.list).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    act(() => fixture.stream?.onStatusChange?.('offline'));
    const dialog = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(dialog).getByRole('tab', { name: 'Unread' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Mark all read' })).toBeDisabled();
    expect(within(dialog).getByText('Offline · Reconnecting')).toBeInTheDocument();
    expect(within(dialog).getByText('No new notifications')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'View all notifications' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close notifications' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('translates an existing live announcement and load failure when the locale changes', async () => {
    fixture.list.mockRejectedValue(new Error('Private infrastructure failure'));
    const user = userEvent.setup(); mount(<NotificationsPage />);
    await screen.findByText('Không thể tải thông báo lúc này. Vui lòng thử lại.');
    act(() => fixture.stream?.onNotification(notice));
    expect(screen.getByText('Bạn có thông báo mới.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load notifications. Please try again.');
    expect(screen.getByText('You have a new notification.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Private infrastructure');
  });
});
