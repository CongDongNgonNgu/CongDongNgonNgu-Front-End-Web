import { ApiClientError, apiClient, resolveApiBaseUrl } from '../../services/api-client';
import type {
  AuthSession,
  AuthUser,
  ProviderCapabilities,
  RegistrationResult,
  SimpleAuthResult,
} from './auth.types';

type JsonValue = Record<string, unknown>;

export class AuthApi {
  private accessToken: string | null = null;
  private refreshPromise: Promise<AuthSession | null> | null = null;

  async bootstrap(): Promise<AuthUser | null> {
    try {
      const session = await this.refreshAccess();
      return session.user;
    } catch {
      this.accessToken = null;
      return null;
    }
  }

  async getProviders(): Promise<ProviderCapabilities> {
    return this.request<ProviderCapabilities>('/auth/providers');
  }

  getOAuthStartUrl(provider: 'google' | 'facebook' | 'zalo' | 'apple', mode: 'login' | 'register' = 'login'): string {
    const base = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
    const url = new URL(
      base + '/auth/oauth/' + encodeURIComponent(provider) + '/start',
      base.startsWith('/') ? window.location.origin : undefined,
    );
    url.searchParams.set('mode', mode);
    return base.startsWith('/') ? url.pathname + url.search : url.toString();
  }

  async register(input: {
    email: string;
    displayName: string;
    password: string;
  }): Promise<RegistrationResult> {
    return this.request<RegistrationResult>('/auth/register', jsonRequest('POST', input));
  }

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/auth/login', jsonRequest('POST', input));
    this.accessToken = session.accessToken;
    return session;
  }

  async verifyEmail(token: string): Promise<SimpleAuthResult> {
    return this.request<SimpleAuthResult>('/auth/verify-email', jsonRequest('POST', { token }));
  }

  async resendVerification(email: string): Promise<SimpleAuthResult> {
    return this.request<SimpleAuthResult>('/auth/resend-verification', jsonRequest('POST', { email }));
  }

  async forgotPassword(email: string): Promise<SimpleAuthResult> {
    return this.request<SimpleAuthResult>('/auth/forgot-password', jsonRequest('POST', { email }));
  }

  async resetPassword(token: string, password: string): Promise<SimpleAuthResult> {
    return this.request<SimpleAuthResult>('/auth/reset-password', jsonRequest('POST', { token, password }));
  }

  async getMe(): Promise<AuthUser> {
    return this.requestWithAuth<AuthUser>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.requestWithAuth<SimpleAuthResult>('/auth/logout', { method: 'POST' }, false);
    } finally {
      this.accessToken = null;
    }
  }

  async refreshAccess(): Promise<AuthSession> {
    if (this.refreshPromise) {
      const existing = await this.refreshPromise;
      if (!existing) throw new ApiClientError('Session expired', 401, 'AUTH_SESSION_EXPIRED');
      return existing;
    }
    this.refreshPromise = this.request<AuthSession>('/auth/refresh', { method: 'POST' })
      .then((session) => {
        this.accessToken = session.accessToken;
        return session;
      })
      .catch(() => {
        this.accessToken = null;
        return null;
      })
      .finally(() => {
        this.refreshPromise = null;
      });
    const session = await this.refreshPromise;
    if (!session) throw new ApiClientError('Session expired', 401, 'AUTH_SESSION_EXPIRED');
    return session;
  }

  getAccessTokenForTests(): string | null {
    return this.accessToken;
  }

  private async requestWithAuth<T>(
    path: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.accessToken) headers.set('Authorization', 'Bearer ' + this.accessToken);
    try {
      return await this.request<T>(path, { ...init, headers });
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401 || !retry || path === '/auth/refresh') {
        throw error;
      }
      await this.refreshAccess();
      return this.requestWithAuth<T>(path, init, false);
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    const method = (init.method ?? 'GET').toUpperCase();
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (method !== 'GET' && method !== 'HEAD') {
      const csrf = readCookie('cdn_csrf');
      if (csrf) headers.set('X-CSRF-Token', csrf);
    }
    return apiClient.request<T>(path, {
      ...init,
      headers,
      credentials: 'include',
    });
  }
}

function jsonRequest(method: string, input: JsonValue): RequestInit {
  return {
    method,
    body: JSON.stringify(input),
  };
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const item = document.cookie.split(';').find((part) => part.trim().startsWith(name + '='));
  if (!item) return null;
  try {
    return decodeURIComponent(item.trim().slice(name.length + 1));
  } catch {
    return null;
  }
}

export const authApi = new AuthApi();
