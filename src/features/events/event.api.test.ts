import { describe, expect, it, vi } from 'vitest';
import { EventApi, type EventApiClient } from './event.api';

describe('EventApi', () => {
  it('builds public list queries from bounded filters', async () => {
    const requestPublic = vi.fn(async <T>(_path: string) => [] as unknown as T);
    const api = new EventApi({
      requestPublic: requestPublic as unknown as EventApiClient['requestPublic'],
      requestProtected: vi.fn(),
      getPublicProfile: vi.fn(),
    });

    await api.list({ state: 'UPCOMING', languageCode: 'en', limit: 20 });

    expect(requestPublic).toHaveBeenCalledWith('/events?state=UPCOMING&languageCode=en&limit=20');
  });

  it('uses the protected detail boundary when the viewer is authenticated', async () => {
    const requestPublic = vi.fn(async <T>(_path: string) => ({}) as T);
    const requestProtected = vi.fn(async <T>(_path: string) => ({}) as T);
    const api = new EventApi({
      requestPublic: requestPublic as unknown as EventApiClient['requestPublic'],
      requestProtected: requestProtected as unknown as EventApiClient['requestProtected'],
      getPublicProfile: vi.fn(),
    });

    await api.get('event/with spaces', true);

    expect(requestProtected).toHaveBeenCalledWith('/events/event%2Fwith%20spaces');
    expect(requestPublic).not.toHaveBeenCalled();
  });

  it('keeps registration writes protected and method-specific', async () => {
    const requestProtected = vi.fn(async <T>(_path: string) => ({}) as T);
    const api = new EventApi({
      requestPublic: vi.fn() as unknown as EventApiClient['requestPublic'],
      requestProtected: requestProtected as unknown as EventApiClient['requestProtected'],
      getPublicProfile: vi.fn(),
    });

    await api.register('event-id');
    await api.cancelRegistration('event-id');

    expect(requestProtected).toHaveBeenNthCalledWith(1, '/events/event-id/register', { method: 'POST' });
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/events/event-id/register', { method: 'DELETE' });
  });
});
