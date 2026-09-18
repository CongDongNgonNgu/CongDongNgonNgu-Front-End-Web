import type { AuthApi } from '../auth/auth-api';
import type { LanguageCatalogItem } from '../languages/languages.types';
import type {
  BuddyProfilePreview,
  BuddyProfilePreviewApi,
  DiscoveryRequest,
  DiscoveryResponse,
  ExchangeRelationshipResponse,
  PartnerDiscoveryApi,
} from './exchange.types';

export class ExchangeApi implements PartnerDiscoveryApi, BuddyProfilePreviewApi {
  constructor(private readonly auth: Pick<AuthApi, 'requestProtected' | 'getLanguages'>) {}

  discover(request: DiscoveryRequest): Promise<DiscoveryResponse> {
    const params = new URLSearchParams();
    appendList(params, 'offeredLanguageCodes', request.offeredLanguageCodes);
    appendList(params, 'wantedLanguageCodes', request.wantedLanguageCodes);
    appendList(params, 'preferredPartnerLevels', request.preferredPartnerLevels);
    appendList(params, 'matchingGoalCodes', request.matchingGoalCodes);
    appendList(params, 'matchingInterestCodes', request.matchingInterestCodes);
    if (request.timezoneCompatibility !== 'ANY') params.set('timezoneCompatibility', request.timezoneCompatibility);
    params.set('page', String(request.page));
    params.set('pageSize', String(request.pageSize));
    return this.auth.requestProtected<DiscoveryResponse>('/exchange/discovery?' + params.toString());
  }

  listLanguages(): Promise<LanguageCatalogItem[]> {
    return this.auth.getLanguages();
  }

  getBuddyProfile(userId: string): Promise<BuddyProfilePreview> {
    return this.auth.requestProtected<BuddyProfilePreview>(
      '/exchange/profile-preview/' + encodeURIComponent(userId),
    );
  }

  getRelationship(userId: string): Promise<ExchangeRelationshipResponse> {
    return this.auth.requestProtected<ExchangeRelationshipResponse>(
      '/exchange/relationships/' + encodeURIComponent(userId),
    );
  }

  requestConnection(userId: string): Promise<ExchangeRelationshipResponse> {
    return this.postRelationshipAction(userId, 'request');
  }

  acceptConnection(userId: string): Promise<ExchangeRelationshipResponse> {
    return this.postRelationshipAction(userId, 'accept');
  }

  declineConnection(userId: string): Promise<ExchangeRelationshipResponse> {
    return this.postRelationshipAction(userId, 'decline');
  }

  cancelConnection(userId: string): Promise<ExchangeRelationshipResponse> {
    return this.postRelationshipAction(userId, 'cancel');
  }

  disconnect(userId: string): Promise<ExchangeRelationshipResponse> {
    return this.postRelationshipAction(userId, 'disconnect');
  }

  private postRelationshipAction(
    userId: string,
    action: 'request' | 'accept' | 'decline' | 'cancel' | 'disconnect',
  ): Promise<ExchangeRelationshipResponse> {
    return this.auth.requestProtected<ExchangeRelationshipResponse>(
      '/exchange/relationships/' + encodeURIComponent(userId) + '/' + action,
      { method: 'POST' },
    );
  }
}

function appendList(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length > 0) params.set(key, values.join(','));
}
