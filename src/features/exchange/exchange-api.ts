import type { AuthApi } from '../auth/auth-api';
import type { LanguageCatalogItem } from '../languages/languages.types';
import type { DiscoveryRequest, DiscoveryResponse, PartnerDiscoveryApi } from './exchange.types';

export class ExchangeApi implements PartnerDiscoveryApi {
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
}

function appendList(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length > 0) params.set(key, values.join(','));
}
