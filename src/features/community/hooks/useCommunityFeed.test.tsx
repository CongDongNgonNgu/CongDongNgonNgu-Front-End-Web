import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCommunityFeed, mergeUniquePosts, type CommunityFeedApiPort } from './useCommunityFeed';
import type { CommunityPost } from '../community.types';

afterEach(cleanup);

function post(id: string): CommunityPost {
  return {
    id,
    author: { id: 'author-1', displayName: 'Lan' },
    targetLanguage: {
      code: 'en',
      slug: 'english',
      nativeName: 'English',
      englishName: 'English',
      vietnameseName: 'Tiếng Anh',
      direction: 'ltr',
    },
    postType: 'DISCUSSION',
    content: id,
    cefrLevel: null,
    topic: null,
    visibility: 'PUBLIC',
    createdAt: '2026-09-12T09:00:00.000Z',
    updatedAt: '2026-09-12T09:00:00.000Z',
    editedAt: null,
    canonicalPath: '/community/posts/' + id,
    isShareable: true,
    isOwner: false,
    helpfulCount: 0,
    viewerReacted: false,
    commentCount: 0,
    isSaved: false,
  };
}

function Harness({ api }: { api: CommunityFeedApiPort }) {
  const feed = useCommunityFeed({ api, authenticated: true, languageCode: 'ja', pageSize: 2 });
  return (
    <>
      <div data-testid='ids'>{feed.items.map((item) => item.id).join(',')}</div>
      <div data-testid='cursor'>{feed.nextCursor ?? ''}</div>
      <button onClick={() => void feed.loadMore()}>Xem thêm</button>
    </>
  );
}

describe('useCommunityFeed', () => {
  it('merges pages by post id and keeps the opaque cursor request untouched', async () => {
    const first = post('post-1');
    const second = post('post-2');
    const third = post('post-3');
    const listPosts = vi.fn<CommunityFeedApiPort['listPosts']>()
      .mockResolvedValueOnce({ items: [first, second], nextCursor: 'opaque/next?token=1' })
      .mockResolvedValueOnce({ items: [second, third], nextCursor: null });
    const api: CommunityFeedApiPort = { listPosts };
    const user = userEvent.setup();
    render(<Harness api={api} />);

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('post-1,post-2'));
    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('post-1,post-2,post-3'));
    expect(api.listPosts).toHaveBeenNthCalledWith(
      1,
      { languageCode: 'ja', limit: 2 },
      true,
    );
    expect(api.listPosts).toHaveBeenNthCalledWith(
      2,
      { languageCode: 'ja', limit: 2, cursor: 'opaque/next?token=1' },
      true,
    );
  });

  it('deduplicates without sorting or decoding server order', () => {
    expect(mergeUniquePosts([post('a'), post('b')], [post('b'), post('c')]).map((item) => item.id))
      .toEqual(['a', 'b', 'c']);
  });
});
