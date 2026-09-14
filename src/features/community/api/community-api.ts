import { authApi } from '../../auth/auth-api';
import type {
  CommunityCreatePostInput,
  CommunityCreateCommentInput,
  CommunityComment,
  CommunityCommentListResponse,
  CommunityCommentQuery,
  CommunityDeleteResponse,
  CommunityPost,
  CommunityPostListResponse,
  CommunityPostQuery,
  CommunityPostUpdateInput,
  CommunityReactionResponse,
  CommunityReportInput,
  CommunityReportResponse,
  CommunityRequestClient,
  CommunitySaveResponse,
  CommunityShareResponse,
  CommunityUpdateCommentInput,
} from '../community.types';

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export class CommunityApi {
  constructor(private readonly client: CommunityRequestClient = authApi) {}

  listPosts(query: CommunityPostQuery = {}, authenticated = false): Promise<CommunityPostListResponse> {
    const params = new URLSearchParams();

    if (query.languageCode) {
      params.set('languageCode', query.languageCode);
    }

    if (query.limit !== undefined) {
      params.set('limit', String(Math.min(Math.max(query.limit, 1), 50)));
    }

    if (query.cursor) {
      params.set('cursor', query.cursor);
    }

    const path = withQuery('/community/posts', params);
    return authenticated
      ? this.client.requestProtected<CommunityPostListResponse>(path)
      : this.client.requestPublic<CommunityPostListResponse>(path);
  }

  createPost(input: CommunityCreatePostInput): Promise<CommunityPost> {
    return this.client.requestProtected<CommunityPost>('/community/posts', jsonRequest('POST', input));
  }

  getPost(postId: string, authenticated = false): Promise<CommunityPost> {
    const path = `/community/posts/${encodeURIComponent(postId)}`;
    return authenticated
      ? this.client.requestProtected<CommunityPost>(path)
      : this.client.requestPublic<CommunityPost>(path);
  }

  listComments(
    postId: string,
    query: CommunityCommentQuery = {},
    authenticated = false,
  ): Promise<CommunityCommentListResponse> {
    const params = new URLSearchParams();
    if (query.limit !== undefined) {
      params.set('limit', String(Math.min(Math.max(query.limit, 1), 20)));
    }
    if (query.cursor) params.set('cursor', query.cursor);
    const path = withQuery(`/community/posts/${encodeURIComponent(postId)}/comments`, params);
    return authenticated
      ? this.client.requestProtected<CommunityCommentListResponse>(path)
      : this.client.requestPublic<CommunityCommentListResponse>(path);
  }

  updatePost(postId: string, input: CommunityPostUpdateInput): Promise<CommunityPost> {
    return this.client.requestProtected<CommunityPost>(
      `/community/posts/${encodeURIComponent(postId)}`,
      jsonRequest('PATCH', input),
    );
  }

  deletePost(postId: string): Promise<CommunityDeleteResponse> {
    return this.client.requestProtected<CommunityDeleteResponse>(
      `/community/posts/${encodeURIComponent(postId)}`,
      { method: 'DELETE' },
    );
  }

  createComment(postId: string, input: CommunityCreateCommentInput): Promise<CommunityComment> {
    return this.client.requestProtected<CommunityComment>(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      jsonRequest('POST', input),
    );
  }

  updateComment(commentId: string, input: CommunityUpdateCommentInput): Promise<CommunityComment> {
    return this.client.requestProtected<CommunityComment>(
      `/community/comments/${encodeURIComponent(commentId)}`,
      jsonRequest('PATCH', input),
    );
  }

  deleteComment(commentId: string): Promise<CommunityDeleteResponse> {
    return this.client.requestProtected<CommunityDeleteResponse>(
      `/community/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' },
    );
  }

  addHelpful(postId: string): Promise<CommunityReactionResponse> {
    return this.client.requestProtected<CommunityReactionResponse>(
      `/community/posts/${encodeURIComponent(postId)}/reactions`,
      jsonRequest('POST', { type: 'HELPFUL' }),
    );
  }

  removeHelpful(postId: string): Promise<CommunityReactionResponse> {
    return this.client.requestProtected<CommunityReactionResponse>(
      `/community/posts/${encodeURIComponent(postId)}/reactions/HELPFUL`,
      { method: 'DELETE' },
    );
  }

  savePost(postId: string): Promise<CommunitySaveResponse> {
    return this.client.requestProtected<CommunitySaveResponse>(
      `/community/posts/${encodeURIComponent(postId)}/save`,
      jsonRequest('POST'),
    );
  }

  unsavePost(postId: string): Promise<CommunitySaveResponse> {
    return this.client.requestProtected<CommunitySaveResponse>(
      `/community/posts/${encodeURIComponent(postId)}/save`,
      { method: 'DELETE' },
    );
  }

  getShareLink(postId: string): Promise<CommunityShareResponse> {
    return this.client.requestPublic<CommunityShareResponse>(
      `/community/posts/${encodeURIComponent(postId)}/share`,
    );
  }

  reportPost(postId: string, input: CommunityReportInput): Promise<CommunityReportResponse> {
    return this.reportTarget('POST', postId, input);
  }

  reportComment(commentId: string, input: CommunityReportInput): Promise<CommunityReportResponse> {
    return this.reportTarget('COMMENT', commentId, input);
  }

  private reportTarget(
    targetType: 'POST' | 'COMMENT',
    targetId: string,
    input: CommunityReportInput,
  ): Promise<CommunityReportResponse> {
    const body: Record<string, string> = { targetType, targetId, category: input.category };
    if (input.details?.trim()) body.details = input.details;
    return this.client.requestProtected<CommunityReportResponse>('/community/reports', jsonRequest('POST', body));
  }
}

export const communityApi = new CommunityApi();
