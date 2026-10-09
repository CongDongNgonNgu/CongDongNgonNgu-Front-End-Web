import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  createNotificationApi,
  type NotificationApi,
  type NotificationPreferenceChange,
  type NotificationPreferencesResponse,
} from './notification.api';
import type {
  NotificationCategory,
  NotificationPreferenceItem,
  NotificationStreamItem,
} from './notification.types';
import { useNotificationStream, type NotificationStreamStatus } from './use-notification-stream';

export type NotificationFilter = 'ALL' | 'UNREAD' | NotificationCategory;
export type NotificationConnectionStatus = 'idle' | NotificationStreamStatus;

interface NotificationCenterContextValue {
  readonly active: boolean;
  readonly items: readonly NotificationStreamItem[];
  readonly visibleItems: readonly NotificationStreamItem[];
  readonly unreadCount: number;
  readonly filter: NotificationFilter;
  readonly setFilter: (filter: NotificationFilter) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly connectionStatus: NotificationConnectionStatus;
  readonly announcement: string;
  readonly refresh: () => Promise<void>;
  readonly markRead: (notificationId: string) => Promise<void>;
  readonly markAllRead: () => Promise<void>;
  readonly preferences: NotificationPreferencesResponse | null;
  readonly preferencesLoading: boolean;
  readonly preferencesSaving: boolean;
  readonly reloadPreferences: () => Promise<void>;
  readonly updatePreferences: (preferences: readonly NotificationPreferenceChange[]) => Promise<void>;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export function NotificationCenterProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const { api: authApi, status, user } = useAuth();
  const notificationApi = useMemo(() => createNotificationApi(authApi), [authApi]);
  const active = enabled && status === 'authenticated' && Boolean(user);
  const scope = useMemo(() => ({ owner: active ? user?.id : null, api: notificationApi }), [active, user?.id, notificationApi]);
  const currentScope = useRef<typeof scope | null>(scope);
  currentScope.current = scope;
  const [dataScope, setDataScope] = useState(scope);
  const listRequest = useRef(0);
  const dataRevision = useRef(0);
  const [items, setItems] = useState<NotificationStreamItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<NotificationConnectionStatus>('idle');
  const [announcement, setAnnouncement] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferencesResponse | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const loadList = useCallback(async () => {
    if (!active || currentScope.current !== scope) return;
    const request = ++listRequest.current;
    const revision = dataRevision.current;
    setLoading(true);
    try {
      const response = await notificationApi.list({ status: 'ALL', limit: 50 });
      if (currentScope.current !== scope || request !== listRequest.current || revision !== dataRevision.current) return;
      setItems(response.items);
      setUnreadCount(response.unreadCount);
      setError(null);
    } catch {
      if (currentScope.current !== scope || request !== listRequest.current || revision !== dataRevision.current) return;
      setError('Không thể tải thông báo lúc này. Vui lòng thử lại.');
    } finally {
      if (currentScope.current === scope && request === listRequest.current) setLoading(false);
    }
  }, [active, notificationApi, scope]);

  const loadPreferences = useCallback(async () => {
    if (!active || currentScope.current !== scope) return;
    setPreferencesLoading(true);
    try {
      const response = await notificationApi.getPreferences();
      if (currentScope.current === scope) setPreferences(response);
    } catch {
      if (currentScope.current !== scope) return;
      setError('Không thể tải tùy chọn thông báo lúc này.');
    } finally {
      if (currentScope.current === scope) setPreferencesLoading(false);
    }
  }, [active, notificationApi, scope]);

  useEffect(() => {
    currentScope.current = scope;
    setDataScope(scope);
    setItems([]);
    setUnreadCount(0);
    setPreferences(null);
    setAnnouncement('');
    setPreferencesSaving(false);
    setError(null);
    setConnectionStatus('idle');
    if (!active) {
      setItems([]);
      setUnreadCount(0);
      setPreferences(null);
      setError(null);
      setConnectionStatus('idle');
      setLoading(false);
      setPreferencesLoading(false);
      return;
    }

    void loadList();
    void loadPreferences();
    return () => { if (currentScope.current === scope) currentScope.current = null; };
  }, [active, loadList, loadPreferences, scope]);

  const handleIncoming = useCallback((notification: NotificationStreamItem) => {
    if (!active || currentScope.current !== scope) return;
    dataRevision.current++;
    setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
    setUnreadCount((current) => {
      const existing = items.find((item) => item.id === notification.id);
      if (notification.read || existing?.read === false) return current;
      return current + 1;
    });
    setAnnouncement('Bạn có thông báo mới.');
  }, [active, items, scope]);

  const accessToken = active ? authApi.getAccessToken() ?? undefined : undefined;
  useNotificationStream(accessToken, {
    onNotification: handleIncoming,
    onPoll: loadList,
    onStatusChange: setConnectionStatus,
    userScope: user?.id,
  });

  const markRead = useCallback(async (notificationId: string) => {
    if (!active || currentScope.current !== scope) return;
    const current = items.find((item) => item.id === notificationId);
    if (!current || current.read) return;
    dataRevision.current++;
    try {
      const response = await notificationApi.markRead(notificationId);
      if (currentScope.current !== scope) return;
      dataRevision.current++;
      setItems((existing) => existing.map((item) => item.id === notificationId
        ? { ...item, read: true, readAt: response.readAt }
        : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      if (currentScope.current !== scope) return;
      setError('Không thể cập nhật trạng thái thông báo.');
    }
  }, [active, items, notificationApi, scope]);

  const markAllRead = useCallback(async () => {
    if (!active || currentScope.current !== scope) return;
    dataRevision.current++;
    try {
      const ids = new Set(items.filter((item) => !item.read).map((item) => item.id));
      let cursor: string | undefined;
      const seenCursors = new Set<string>();
      for (let page = 0; page < 100; page += 1) {
        const response = await notificationApi.list({ status: 'UNREAD', limit: 50, cursor });
        if (currentScope.current !== scope) return;
        response.items.forEach((item) => ids.add(item.id));
        if (!response.nextCursor) break;
        if (seenCursors.has(response.nextCursor)) throw new Error('Notification pagination repeated.');
        seenCursors.add(response.nextCursor);
        cursor = response.nextCursor;
        if (page === 99) throw new Error('Notification pagination exceeded the safe limit.');
      }

      const notificationIds = [...ids];
      let remainingUnread = 0;
      for (let index = 0; index < notificationIds.length; index += 100) {
        const response = await notificationApi.markManyRead(notificationIds.slice(index, index + 100));
        if (currentScope.current !== scope) return;
        remainingUnread = response.unreadCount;
      }
      dataRevision.current++;
      setItems((existing) => existing.map((item) => notificationIds.includes(item.id)
        ? { ...item, read: true, readAt: item.readAt ?? new Date().toISOString() }
        : item));
      setUnreadCount(remainingUnread);
    } catch {
      if (currentScope.current !== scope) return;
      setError('Không thể đánh dấu tất cả thông báo đã đọc.');
    }
  }, [active, items, notificationApi, scope]);

  const updatePreferences = useCallback(async (changes: readonly NotificationPreferenceChange[]) => {
    if (!active || currentScope.current !== scope) return;
    setPreferencesSaving(true);
    try {
      const response = await notificationApi.updatePreferences(changes);
      if (currentScope.current !== scope) return;
      setPreferences(response);
      setError(null);
    } catch {
      if (currentScope.current !== scope) return;
      setError('Không thể lưu tùy chọn thông báo.');
      throw new Error('Notification preferences could not be saved.');
    } finally {
      if (currentScope.current === scope) setPreferencesSaving(false);
    }
  }, [active, notificationApi, scope]);

  const visibleItems = useMemo(
    () => items.filter((item) => filter === 'ALL'
      || (filter === 'UNREAD' ? !item.read : item.category === filter)),
    [filter, items],
  );

  const value = useMemo<NotificationCenterContextValue>(() => ({
    active,
    items: dataScope === scope ? items : [],
    visibleItems: dataScope === scope ? visibleItems : [],
    unreadCount: dataScope === scope ? unreadCount : 0,
    filter,
    setFilter,
    loading,
    error,
    connectionStatus,
    announcement,
    refresh: loadList,
    markRead,
    markAllRead,
    preferences: dataScope === scope ? preferences : null,
    preferencesLoading,
    preferencesSaving,
    reloadPreferences: loadPreferences,
    updatePreferences,
  }), [active, announcement, connectionStatus, dataScope, scope, error, filter, items, loadList, loadPreferences, loading, markAllRead, markRead, preferences, preferencesLoading, preferencesSaving, unreadCount, updatePreferences, visibleItems]);

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter(): NotificationCenterContextValue {
  const context = useContext(NotificationCenterContext);
  if (!context) throw new Error('useNotificationCenter must be used inside NotificationCenterProvider');
  return context;
}

export function useOptionalNotificationCenter(): NotificationCenterContextValue | null {
  return useContext(NotificationCenterContext);
}

export function getPreferenceChangeMatrix(
  preferences: readonly NotificationPreferenceItem[],
): NotificationPreferenceChange[] {
  return preferences.map(({ category, channel, enabled }) => ({ category, channel, enabled }));
}

export function getPreferenceLabel(preference: NotificationPreferenceItem): string {
  const category = {
    COMMUNITY: 'Cộng đồng',
    CORRECTIONS: 'Hiệu đính',
    EXCHANGE: 'Kết nối học tập',
    REPUTATION: 'Uy tín học thuật',
    MEMBERSHIP: 'Membership',
    SECURITY: 'Bảo mật',
    MODERATION: 'Kiểm duyệt',
    SYSTEM: 'Hệ thống',
  }[preference.category];
  const channel = {
    IN_APP: 'Trong ứng dụng',
    SSE: 'Cập nhật trực tiếp',
    EMAIL: 'Email (sắp có)',
    PUSH: 'Push (sắp có)',
  }[preference.channel];
  return `${category} · ${channel}`;
}
