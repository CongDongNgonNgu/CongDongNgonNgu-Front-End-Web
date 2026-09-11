import { apiClient } from '../../../services/api-client';
import { buildLanguageHubSearch } from '../domain/language-filters';
import type {
  CefrLevel,
  LanguageApiPort,
  LanguageCatalogItem,
  LanguageHubFilters,
  LanguageHubOverview,
} from '../languages.types';

export class LanguageApi {
  constructor(private readonly client: LanguageApiPort = apiClient) {}

  listLanguages(search = ''): Promise<LanguageCatalogItem[]> {
    const params = new URLSearchParams();
    const value = search.trim();
    if (value) params.set('search', value);
    return this.client.get<LanguageCatalogItem[]>(withQuery('/languages', params));
  }

  getLanguage(slug: string): Promise<LanguageCatalogItem> {
    return this.client.get<LanguageCatalogItem>(`/languages/${encodeURIComponent(slug)}`);
  }

  getOverview(slug: string, filters: LanguageHubFilters): Promise<LanguageHubOverview> {
    const normalizedFilters: LanguageHubFilters = {
      levels: filters.levels as CefrLevel[],
      topic: filters.topic,
    };
    const search = buildLanguageHubSearch(normalizedFilters);
    return this.client.get<LanguageHubOverview>(
      `/languages/${encodeURIComponent(slug)}/overview${search}`,
    );
  }
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const languageApi = new LanguageApi();
