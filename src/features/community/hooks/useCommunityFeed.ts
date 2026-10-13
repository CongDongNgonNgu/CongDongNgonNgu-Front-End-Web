import { translate, type UiLocale } from '../../ui-locale/ui-locale';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { communityApi } from '../api/community-api';
import type { CommunityPost, CommunityPostListResponse, CommunityPostQuery } from '../community.types';
import type { CommunitySearchQuery } from '../community-search';

export interface CommunityFeedApiPort {
  listPosts: (query?: CommunityPostQuery, authenticated?: boolean) => Promise<CommunityPostListResponse>;
}
export interface UseCommunityFeedOptions {
  api?: CommunityFeedApiPort;
  authenticated: boolean;
  actorId?: string;
  query?: CommunitySearchQuery;
  languageCode?: string;
  pageSize?: number;
  enabled?: boolean;
}
export interface CommunityFeedState {
  items: CommunityPost[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: unknown;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Compatibility callback: always reload the authoritative filtered/ranked feed. */
  prependPost: (post: CommunityPost) => void;
}
export function mergeUniquePosts(first: CommunityPost[], second: CommunityPost[]): CommunityPost[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}
export function isCommunityCursorError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'COMMUNITY_INVALID_CURSOR';
}
export function getCommunityFeedErrorMessage(error: unknown, locale: UiLocale = 'vi'): string {
  if (isCommunityCursorError(error)) return translate(locale, 'community.search.cursorError');
  if (error instanceof ApiClientError && error.code === 'COMMUNITY_SEARCH_RETRY') return translate(locale, 'community.search.retryError');
  if (error instanceof ApiClientError && error.status === 429) {
    return translate(locale, 'community.posts.you.have.sent.too.many.requests.please.try.alternative');
  }
  return translate(locale, 'community.posts.unable.to.load.the.community.feed.please.try');
}
export function useCommunityFeed({ api = communityApi, authenticated, actorId, query, languageCode, pageSize = 20, enabled = true }: UseCommunityFeedOptions): CommunityFeedState {
  // A primitive key avoids refetches caused by fresh but equivalent caller objects.
  const queryKey = JSON.stringify({ ...query, languageCode: query?.languageCode ?? languageCode });
  const baseQuery = useMemo(() => JSON.parse(queryKey) as CommunitySearchQuery, [queryKey]);
  const allowed = enabled && (!baseQuery.savedByMe || authenticated);
  const scopeKey = JSON.stringify([queryKey, authenticated ? actorId ?? 'authenticated' : 'anonymous', pageSize, allowed]);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  const [dataScope, setDataScope] = useState(scopeKey);
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(allowed);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);
  const firstPageRequest = useRef<number | null>(null);
  const pageRequest = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const generation = ++requestId.current;
    const isCurrent = () => generation === requestId.current && currentScope.current === scopeKey;
    firstPageRequest.current = allowed ? generation : null;
    pageRequest.current = null;
    setDataScope(scopeKey);
    setItems([]);
    setNextCursor(null);
    setError(null);
    setIsLoadingMore(false);
    setIsLoading(allowed);
    if (!allowed) return;
    try {
      const result = await api.listPosts({ ...baseQuery, limit: pageSize }, authenticated);
      if (!isCurrent()) return;
      setItems(mergeUniquePosts([], result.items));
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (isCurrent()) setError(cause);
    } finally {
      if (isCurrent()) setIsLoading(false);
      if (firstPageRequest.current === generation) firstPageRequest.current = null;
    }
  }, [allowed, api, authenticated, baseQuery, pageSize, scopeKey]);

  useEffect(() => {
    void refresh();
    return () => { ++requestId.current; };
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (firstPageRequest.current !== null || !allowed || !nextCursor || isLoading || isLoadingMore || pageRequest.current !== null || currentScope.current !== scopeKey) return;
    const generation = requestId.current;
    const isCurrent = () => generation === requestId.current && currentScope.current === scopeKey;
    pageRequest.current = generation;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await api.listPosts({ ...baseQuery, limit: pageSize, cursor: nextCursor }, authenticated);
      if (!isCurrent()) return;
      setItems((current) => mergeUniquePosts(current, result.items));
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (!isCurrent()) return;
      setError(cause);
      if (isCommunityCursorError(cause)) setNextCursor(null);
    } finally {
      if (isCurrent()) setIsLoadingMore(false);
      if (pageRequest.current === generation) pageRequest.current = null;
    }
  }, [allowed, api, authenticated, baseQuery, isLoading, isLoadingMore, nextCursor, pageSize, scopeKey]);

  const prependPost = useCallback(() => { void refresh(); }, [refresh]);
  const visible = dataScope === scopeKey && allowed;
  return { items: visible ? items : [], nextCursor: visible ? nextCursor : null, isLoading: dataScope !== scopeKey ? allowed : isLoading, isLoadingMore: visible && isLoadingMore, error: visible ? error : null, loadMore, refresh, prependPost };
}
