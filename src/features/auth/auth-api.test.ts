import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, apiClient } from '../../services/api-client';
import { AuthApi } from './auth-api';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  document.cookie = 'cdn_csrf=; Max-Age=0; path=/';
});

const session = {
  user: {
    id: 'user-1',
    email: 'learner@example.com',
    displayName: 'Learner',
    status: 'ACTIVE' as const,
    emailVerified: true,
    roles: ['MEMBER'],
  },
  accessToken: 'access-token',
  expiresIn: 900,
};

describe('AuthApi', () => {
  it('deduplicates concurrent refresh requests', async () => {
    let resolveRefresh!: (value: typeof session) => void;
    const refresh = new Promise<typeof session>((resolve) => {
      resolveRefresh = resolve;
    });
    const request = vi.spyOn(apiClient, 'request').mockImplementation((path) => {
      if (path === '/auth/refresh') return refresh;
      return Promise.reject(new Error('unexpected request'));
    });
    const api = new AuthApi();
    const first = api.refreshAccess();
    const second = api.refreshAccess();
    resolveRefresh(session);
    await expect(Promise.all([first, second])).resolves.toEqual([session, session]);
    expect(request).toHaveBeenCalledOnce();
  });

  it('retries one protected request after an expired access token', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockRejectedValueOnce(new ApiClientError('expired', 401, 'AUTH_SESSION_EXPIRED'))
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(session.user);
    const api = new AuthApi();
    await expect(api.login({ email: 'learner@example.com', password: 'long enough password' })).rejects.toThrow();
    request.mockReset();
    request
      .mockRejectedValueOnce(new ApiClientError('expired', 401, 'AUTH_SESSION_EXPIRED'))
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(session.user);
    await expect(api.getMe()).resolves.toEqual(session.user);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('clears the in-memory access token when refresh fails', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce(session)
      .mockRejectedValueOnce(new ApiClientError('expired', 401, 'AUTH_SESSION_EXPIRED'));
    const api = new AuthApi();
    await api.login({ email: 'learner@example.com', password: 'long enough password' });

    await expect(api.refreshAccess()).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
    expect(api.getAccessTokenForTests()).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('sends credentials and the readable CSRF cookie on mutations', async () => {
    document.cookie = 'cdn_csrf=csrf-value; path=/';
    const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ sent: true });
    const api = new AuthApi();
    await api.forgotPassword('learner@example.com');
    expect(request).toHaveBeenCalledWith(
      '/auth/forgot-password',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    );
    const init = request.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('csrf-value');
  });

  it('builds OAuth redirects from the configured API base', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://auth.example.test/api/v1');
    const api = new AuthApi();
    expect(api.getOAuthStartUrl('google')).toBe(
      'https://auth.example.test/api/v1/auth/oauth/google/start?mode=login',
    );
  });
});
