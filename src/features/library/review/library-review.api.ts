import type { AuthApi } from '../../auth/auth-api';
import type {
  LibraryInvalidSourceQueuePage,
  LibraryReviewApiPort,
  LibraryReviewDetail,
  LibraryReviewMutationResult,
  LibraryReviewQueuePage,
  LibraryReviewQueueQuery,
} from './library-review.types';

export type LibraryReviewAuthTransport = Pick<AuthApi, 'requestProtected'>;

export class LibraryReviewApi implements LibraryReviewApiPort {
  constructor(private readonly auth: LibraryReviewAuthTransport) {}

  listReviewQueue(query: LibraryReviewQueueQuery = {}): Promise<LibraryReviewQueuePage> {
    const params = new URLSearchParams();
    if (query.q?.trim()) params.set('q', query.q.trim());
    if (query.language?.trim()) params.set('language', query.language.trim());
    if (query.type) params.set('type', query.type);
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit !== undefined) params.set('limit', String(Math.min(Math.max(query.limit, 1), 50)));
    return this.auth.requestProtected<LibraryReviewQueuePage>(withQuery('/library/reviews', params));
  }

  listInvalidSourceQueue(query: { cursor?: string; limit?: number } = {}): Promise<LibraryInvalidSourceQueuePage> {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit !== undefined) params.set('limit', String(Math.min(Math.max(query.limit, 1), 50)));
    return this.auth.requestProtected<LibraryInvalidSourceQueuePage>(withQuery('/library/reviews/source-invalid', params));
  }

  getReviewDetail(resourceId: string): Promise<LibraryReviewDetail> {
    return this.auth.requestProtected<LibraryReviewDetail>(`/library/reviews/${encodeURIComponent(resourceId)}`);
  }

  transitionReview(resourceId: string, input: { nextState: 'VERIFIED' | 'REJECTED'; note?: string }): Promise<LibraryReviewMutationResult> {
    return this.auth.requestProtected<LibraryReviewMutationResult>(
      `/library/resources/${encodeURIComponent(resourceId)}/review`,
      jsonRequest('POST', input),
    );
  }

  reconcileSource(resourceId: string, input: { note?: string } = {}): Promise<LibraryReviewMutationResult> {
    return this.auth.requestProtected<LibraryReviewMutationResult>(
      `/library/reviews/${encodeURIComponent(resourceId)}/reconcile-source`,
      jsonRequest('POST', input),
    );
  }
}

function jsonRequest(method: string, body: object): RequestInit {
  return { method, body: JSON.stringify(body) };
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
