import { apiClient } from '../../services/api-client';
import type {
  LibraryPublicResource,
  LibrarySearchPage,
  LibrarySearchQuery,
} from './library.types';

export interface LibraryRequestClient {
  get<T>(path: string): Promise<T>;
}

export class LibraryApi {
  constructor(private readonly client: LibraryRequestClient = apiClient) {}

  listResources(query: Partial<LibrarySearchQuery> = {}): Promise<LibrarySearchPage> {
    const params = new URLSearchParams();
    if (query.q?.trim()) params.set('q', query.q.trim());
    if (query.language) params.set('language', query.language);
    if (query.type) params.set('type', query.type);
    if (query.topic?.trim()) params.set('topic', query.topic.trim());
    if (query.level) params.set('level', query.level);
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit !== undefined) params.set('limit', String(Math.min(Math.max(query.limit, 1), 50)));
    return this.client.get<LibrarySearchPage>(withQuery('/library/resources', params));
  }

  getResource(resourceId: string): Promise<LibraryPublicResource> {
    return this.client.get<LibraryPublicResource>(
      `/library/resources/${encodeURIComponent(resourceId)}`,
    );
  }
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const libraryApi = new LibraryApi();
