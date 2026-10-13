import { translate, type UiLocale } from '../../ui-locale/ui-locale';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { communityApi } from '../api/community-api';
import type {
  CommunityPost,
  CommunityPostListResponse,
  CommunityPostQuery,
} from '../community.types';

export interface CommunityFeedApiPort {
  listPosts: (query?: CommunityPostQuery, authenticated?: boolean) => Promise<CommunityPostListResponse>;
}

export interface UseCommunityFeedOptions {
  api?: CommunityFeedApiPort;
  authenticated: boolean;
  languageCode?: string;
  pageSize?: number;
}

export interface CommunityFeedState {
  items: CommunityPost[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: unknown;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
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

export function getCommunityFeedErrorMessage(error: unknown, locale: UiLocale = 'vi'): string {
  if (error instanceof ApiClientError && error.status === 429) {
    return translate(locale, "community.posts.you.have.sent.too.many.requests.please.try.alternative");
  }
  return translate(locale, "community.posts.unable.to.load.the.community.feed.please.try");
}

export function useCommunityFeed({
  api = communityApi,
  authenticated,
  languageCode,
  pageSize = 20,
}: UseCommunityFeedOptions): CommunityFeedState {
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setItems([]);
    setNextCursor(null);
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.listPosts({ languageCode, limit: pageSize }, authenticated);
      if (currentRequest !== requestId.current) return;
      setItems(mergeUniquePosts([], result.items));
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [api, authenticated, languageCode, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading || isLoadingMore) return;
    const currentRequest = requestId.current;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await api.listPosts(
        { languageCode, limit: pageSize, cursor: nextCursor },
        authenticated,
      );
      if (currentRequest !== requestId.current) return;
      setItems((current) => mergeUniquePosts(current, result.items));
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoadingMore(false);
    }
  }, [api, authenticated, isLoading, isLoadingMore, languageCode, nextCursor, pageSize]);

  const prependPost = useCallback((post: CommunityPost) => {
    setItems((current) => mergeUniquePosts([post], current));
  }, []);

  return { items, nextCursor, isLoading, isLoadingMore, error, loadMore, refresh, prependPost };
}
