import { authApi, type AuthApi } from '../auth/auth-api';
import type { PublicProfile } from '../passport/passport.types';
import type {
  EventPublicSummary,
  EventRegistrationResponse,
  EventStateFilter,
} from './event.types';

export interface EventListInput {
  state?: EventStateFilter;
  languageCode?: string;
  limit?: number;
}

export type EventApiClient = Pick<AuthApi, 'requestPublic' | 'requestProtected' | 'getPublicProfile'>;

export class EventApi {
  constructor(private readonly client: EventApiClient) {}

  list(input: EventListInput = {}): Promise<EventPublicSummary[]> {
    const params = new URLSearchParams();
    if (input.state) params.set('state', input.state);
    if (input.languageCode) params.set('languageCode', input.languageCode);
    if (input.limit) params.set('limit', String(input.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.client.requestPublic<EventPublicSummary[]>(`/events${suffix}`);
  }

  get(eventId: string, authenticated = false): Promise<EventPublicSummary> {
    const path = `/events/${encodeURIComponent(eventId)}`;
    return authenticated
      ? this.client.requestProtected<EventPublicSummary>(path)
      : this.client.requestPublic<EventPublicSummary>(path);
  }

  getRegistration(eventId: string): Promise<EventRegistrationResponse> {
    return this.client.requestProtected<EventRegistrationResponse>(
      `/events/${encodeURIComponent(eventId)}/registration`,
    );
  }

  register(eventId: string): Promise<EventRegistrationResponse> {
    return this.client.requestProtected<EventRegistrationResponse>(
      `/events/${encodeURIComponent(eventId)}/register`,
      { method: 'POST' },
    );
  }

  cancelRegistration(eventId: string): Promise<EventRegistrationResponse> {
    return this.client.requestProtected<EventRegistrationResponse>(
      `/events/${encodeURIComponent(eventId)}/register`,
      { method: 'DELETE' },
    );
  }

  getHostProfile(userId: string): Promise<PublicProfile> {
    return this.client.getPublicProfile(userId);
  }
}

export function createEventApi(auth: EventApiClient): EventApi {
  return new EventApi(auth);
}

export const eventApi = new EventApi(authApi);
