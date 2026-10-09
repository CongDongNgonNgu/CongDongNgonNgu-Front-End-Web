import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenterProvider, useNotificationCenter } from './NotificationCenterProvider';
import type { NotificationListResponse } from './notification.types';

const fixture = vi.hoisted(() => ({ owner: 'owner-a', list: vi.fn(), preferences: vi.fn(), markRead: vi.fn() }));
const authApi = { getAccessToken: () => 'synthetic-token' };
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ api: authApi, status: 'authenticated', user: { id: fixture.owner } }) }));
vi.mock('./notification.api', () => ({ createNotificationApi: () => ({ list: fixture.list, getPreferences: fixture.preferences, markRead: fixture.markRead }) }));
vi.mock('./use-notification-stream', () => ({ useNotificationStream: () => undefined }));
let refresh: () => Promise<void>;
let markRead: (id: string) => Promise<void>;
let readState: boolean | undefined;
function View() {
  const center = useNotificationCenter(); refresh = center.refresh;
  markRead = center.markRead; readState = center.items[0]?.read;
  return <output>{center.items.map(item => item.actor.kind === 'USER' ? item.actor.displayName : '').join(',')}</output>;
}
const page = (name: string): NotificationListResponse => ({ nextCursor: null, unreadCount: 1, items: [{
  id: name, notificationType: 'BUDDY_CONNECTED', category: 'EXCHANGE', priority: 'NORMAL',
  actor: { kind: 'USER', displayName: name, profilePath: null }, target: null, variables: {},
  createdAt: '2026-10-09T00:00:00Z', read: false, readAt: null,
}] });
afterEach(() => { cleanup(); vi.resetAllMocks(); fixture.owner = 'owner-a'; });

describe('notification account scope', () => {
  it('does not let an older poll undo a successful read mutation', async () => {
    let release!: (value: NotificationListResponse) => void;
    fixture.preferences.mockResolvedValue({ scope: 'own', preferences: [] });
    fixture.list.mockResolvedValueOnce(page('Current actor')).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    fixture.markRead.mockResolvedValue({ readAt: '2026-10-09T00:01:00Z' });
    render(<NotificationCenterProvider><View /></NotificationCenterProvider>);
    await screen.findByText('Current actor');
    let pending!: Promise<void>;
    act(() => { pending = refresh(); });
    await act(async () => { await markRead('Current actor'); });
    expect(readState).toBe(true);
    await act(async () => { release(page('Current actor')); await pending; });
    expect(readState).toBe(true);
  });

  it('keeps the latest canonical response when same-account refreshes resolve out of order', async () => {
    let release!: (value: NotificationListResponse) => void;
    fixture.preferences.mockResolvedValue({ scope: 'own', preferences: [] });
    fixture.list.mockResolvedValueOnce(page('First actor')).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }))
      .mockResolvedValue(page('Latest actor'));
    render(<NotificationCenterProvider><View /></NotificationCenterProvider>);
    await screen.findByText('First actor');
    let pending!: Promise<void>;
    act(() => { pending = refresh(); });
    await act(async () => { await refresh(); });
    await screen.findByText('Latest actor');
    await act(async () => { release(page('Stale actor')); await pending; });
    expect(screen.getByRole('status')).toHaveTextContent('Latest actor');
  });

  it('reloads for a new account and discards the previous account refresh response', async () => {
    let release!: (value: NotificationListResponse) => void;
    fixture.preferences.mockResolvedValue({ scope: 'own', preferences: [] });
    fixture.list.mockResolvedValueOnce(page('First actor')).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }))
      .mockResolvedValue(page('Second actor'));
    const mounted = render(<NotificationCenterProvider><View /></NotificationCenterProvider>);
    await screen.findByText('First actor');
    let pending!: Promise<void>;
    act(() => { pending = refresh(); });
    fixture.owner = 'owner-b';
    mounted.rerender(<NotificationCenterProvider><View /></NotificationCenterProvider>);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Second actor'));
    await act(async () => { release(page('Stale private actor')); await pending; });
    expect(screen.getByRole('status')).toHaveTextContent('Second actor');
    expect(screen.queryByText('Stale private actor')).not.toBeInTheDocument();
  });
});
