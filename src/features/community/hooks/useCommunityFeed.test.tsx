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
import { act, renderHook } from '@testing-library/react';
import type { CommunityPostQuery } from '../community.types';

function deferredPage() {
  let resolve!: (value:{items:CommunityPost[];nextCursor:string|null})=>void;
  const promise=new Promise<{items:CommunityPost[];nextCursor:string|null}>((done)=>{resolve=done;});
  return {promise,resolve};
}

it('resets a pending pagination request when filters or actor change and ignores its late response', async () => {
  const oldPage=deferredPage();
  const listPosts=vi.fn<CommunityFeedApiPort['listPosts']>()
    .mockResolvedValueOnce({items:[post('old')],nextCursor:'old-cursor'})
    .mockReturnValueOnce(oldPage.promise)
    .mockResolvedValueOnce({items:[post('new')],nextCursor:'new-cursor'});
  const api={listPosts};
  const {result,rerender}=renderHook(({query,actorId}:{query:CommunityPostQuery;actorId:string})=>useCommunityFeed({api,authenticated:true,actorId,query}),{initialProps:{query:{q:'old'} as CommunityPostQuery,actorId:'A'}});
  await waitFor(()=>expect(result.current.items[0]?.id).toBe('old'));
  act(()=>{void result.current.loadMore();});
  expect(result.current.isLoadingMore).toBe(true);
  rerender({query:{q:'new',savedByMe:true},actorId:'B'});
  await waitFor(()=>expect(result.current.items[0]?.id).toBe('new'));
  expect(result.current.isLoadingMore).toBe(false);
  await act(async()=>oldPage.resolve({items:[post('stale')],nextCursor:'stale-cursor'}));
  expect(result.current.items.map(x=>x.id)).toEqual(['new']);
  expect(result.current.nextCursor).toBe('new-cursor');
  expect(listPosts).toHaveBeenLastCalledWith({q:'new',savedByMe:true,limit:20},true);
});

it('never requests saved-by-me anonymously and clears authenticated results on sign-out', async () => {
  const listPosts=vi.fn<CommunityFeedApiPort['listPosts']>().mockResolvedValue({items:[post('saved')],nextCursor:'private-scope'});
  const api={listPosts};
  const {result,rerender}=renderHook(({authenticated})=>useCommunityFeed({api,authenticated,actorId:authenticated?'A':undefined,query:{savedByMe:true}}),{initialProps:{authenticated:true}});
  await waitFor(()=>expect(result.current.items).toHaveLength(1));
  rerender({authenticated:false});
  expect(result.current.items).toEqual([]);
  expect(result.current.nextCursor).toBeNull();
  expect(result.current.isLoadingMore).toBe(false);
  expect(listPosts).toHaveBeenCalledTimes(1);
});

it('refreshes from the first page instead of accepting a late page after a manual refresh', async () => {
  const late=deferredPage();
  const listPosts=vi.fn<CommunityFeedApiPort['listPosts']>()
    .mockResolvedValueOnce({items:[post('old')],nextCursor:'cursor'})
    .mockReturnValueOnce(late.promise)
    .mockResolvedValueOnce({items:[post('refreshed')],nextCursor:null});
  const api={listPosts};
  const {result}=renderHook(()=>useCommunityFeed({api,authenticated:true,query:{sort:'USEFUL'}}));
  await waitFor(()=>expect(result.current.nextCursor).toBe('cursor'));
  act(()=>{void result.current.loadMore();});
  await act(async()=>result.current.refresh());
  await act(async()=>late.resolve({items:[post('late')],nextCursor:'late'}));
  expect(result.current.items.map(x=>x.id)).toEqual(['refreshed']);
  expect(result.current.isLoadingMore).toBe(false);
});
import { ApiClientError } from '../../../services/api-client';

it('clears a rejected cursor so recovery refreshes the first page in the same filter scope', async () => {
  const listPosts=vi.fn<CommunityFeedApiPort['listPosts']>()
    .mockResolvedValueOnce({items:[post('initial')],nextCursor:'bad-cursor'})
    .mockRejectedValueOnce(new ApiClientError('invalid cursor',400,'COMMUNITY_INVALID_CURSOR'))
    .mockResolvedValueOnce({items:[post('fresh')],nextCursor:null});
  const api={listPosts};
  const {result}=renderHook(()=>useCommunityFeed({api,authenticated:true,query:{q:'literal',sort:'USEFUL'}}));
  await waitFor(()=>expect(result.current.nextCursor).toBe('bad-cursor'));
  await act(async()=>result.current.loadMore());
  expect(result.current.nextCursor).toBeNull();
  expect(result.current.items[0].id).toBe('initial');
  await act(async()=>result.current.refresh());
  expect(listPosts).toHaveBeenLastCalledWith({q:'literal',sort:'USEFUL',limit:20},true);
  expect(result.current.items[0].id).toBe('fresh');
});

it('reloads an authoritative filtered page after creation instead of injecting the created post', async () => {
  const listPosts=vi.fn<CommunityFeedApiPort['listPosts']>().mockResolvedValue({items:[post('matches')],nextCursor:null});
  const api={listPosts};
  const {result}=renderHook(()=>useCommunityFeed({api,authenticated:true,query:{postType:'QUESTION'}}));
  await waitFor(()=>expect(result.current.items).toHaveLength(1));
  act(()=>result.current.prependPost(post('wrong-type')));
  await waitFor(()=>expect(listPosts).toHaveBeenCalledTimes(2));
  expect(result.current.items.map(item=>item.id)).toEqual(['matches']);
  expect(listPosts).toHaveBeenLastCalledWith({postType:'QUESTION',limit:20},true);
});
