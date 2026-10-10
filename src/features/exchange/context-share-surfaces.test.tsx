import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageHubCoreJourneys } from '../languages/components/LanguageHubCoreJourneys';
import { LibraryExplorerPageView } from '../library/pages/LibraryExplorerPage';
import { LibraryResourceDetailPage } from '../library/pages/LibraryResourceDetailPage';
import { LibraryRelatedResourceCard } from '../library/components/LibraryRelatedResourceCard';
import type { LibraryPublicResource, LibraryPublicSearchItem } from '../library/library.types';
import { CommunityPostCard, type CommunityPostActionsApi } from '../community/components/CommunityPostCard';
import { CommunityPostDetailPageView, type CommunityPostDetailApi } from '../community/pages/CommunityPostDetailPage';
import type { CommunityPost } from '../community/community.types';

const { shared } = vi.hoisted(() => ({ shared: vi.fn() }));
// This test owns source selection/eligibility; real dialog, transport and actor lifecycle have separate tests.
vi.mock('./components/ShareContextButton', () => ({ ShareContextButton: ({ reference }: { reference: unknown }) =>
  <button onClick={() => shared(reference)}>Share current content</button> }));
afterEach(() => { cleanup();vi.clearAllMocks(); });
const resourceId = 'eb52692c-752c-4627-aa43-745927171d6a';
const postId = 'ee7b81f5-c07b-4e3e-a75b-06d0572ba4e1';
function resource(type: 'VOCABULARY' | 'SENTENCE' = 'VOCABULARY'): LibraryPublicResource {
  return { id: resourceId, resourceType: type, primaryLanguageCode: 'en', secondaryLanguageCode: null, cefrLevel: 'A1', topics: [], reviewState: 'VERIFIED',
    details: type === 'VOCABULARY' ? { resourceType: type, term: 'Canonical greeting', definition: 'Greeting', partOfSpeech: null, exampleSentence: null }
      : { resourceType: type, text: 'Canonical greeting', context: 'Current sentence' }, provenance: [], createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' };
}
function post(patch: Partial<CommunityPost> = {}): CommunityPost {
  return { id: postId, author: { id: 'author', displayName: 'Author' }, targetLanguage: { code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', direction: 'ltr' },
    postType: 'DISCUSSION', content: 'Public learning discussion', cefrLevel: null, topic: null, visibility: 'PUBLIC', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z', editedAt: null,
    canonicalPath: '/community/posts/' + postId, isShareable: true, isOwner: false, helpfulCount: 0, viewerReacted: false, commentCount: 0, isSaved: false, ...patch };
}
const actions = (): CommunityPostActionsApi => ({ addHelpful: vi.fn(), removeHelpful: vi.fn(), savePost: vi.fn(), unsavePost: vi.fn(), getShareLink: vi.fn(), reportPost: vi.fn() });
describe('canonical content sharing surface matrix', () => {
  it.each(['VOCABULARY', 'SENTENCE'] as const)('follows the actual Hub %s filter through Library to the canonical reference', async type => {
    const target = resource(type);const item: LibraryPublicSearchItem = { ...target, preview: { title: 'Canonical greeting', excerpt: 'Current public content' } };
    const api = { listResources: vi.fn().mockResolvedValue({ items: [item], nextCursor: null }), getResource: vi.fn().mockResolvedValue(target) };
    render(<MemoryRouter><Routes>
      <Route path='/' element={<LanguageHubCoreJourneys language={{ code: 'en', nativeName: 'English' }} filters={{ levels: [], topic: null }}/>} />
      <Route path='/library' element={<LibraryExplorerPageView api={api} catalogApi={{ listLanguages: async () => [] }}/>} />
      <Route path='/library/:resourceId' element={<LibraryResourceDetailPage api={api}/>} />
    </Routes></MemoryRouter>);
    const entry = screen.getAllByRole('link').find(link => link.getAttribute('href') === '/library?language=en&type=' + type)!;
    await userEvent.click(entry);await userEvent.click(await screen.findByRole('link', { name: /Canonical greeting/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Share current content' }));
    expect(api.listResources).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', type }));
    expect(shared).toHaveBeenCalledExactlyOnceWith({ type: 'LIBRARY_RESOURCE', id: resourceId });
  });
  it('shares the Related target UUID without relation or anchor metadata', async () => {
    render(<MemoryRouter><LibraryRelatedResourceCard item={{ resource: resource(), relation: { type: 'FOLLOW_UP' } }}/></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Share current content' }));
    expect(shared).toHaveBeenCalledExactlyOnceWith({ type: 'LIBRARY_RESOURCE', id: resourceId });
  });
  it.each(['DISCUSSION', 'QUESTION'] as const)('shares a public Community %s canonical post', async postType => {
    render(<MemoryRouter><CommunityPostCard post={post({ postType })} api={actions()} authenticated onAuthRequired={vi.fn()}/></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Share current content' }));
    expect(shared).toHaveBeenCalledExactlyOnceWith({ type: 'COMMUNITY_POST', id: postId });
  });
  it.each([{ visibility: 'PRIVATE' as const }, { isShareable: false }, { postType: 'CORRECTION_REQUEST' as const }, { postType: 'RESOURCE' as const }])('omits unsupported or private Community targets: %j', patch => {
    render(<MemoryRouter><CommunityPostCard post={post(patch)} api={actions()} authenticated onAuthRequired={vi.fn()}/></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Share current content' })).not.toBeInTheDocument();
  });
  it('exposes the same canonical share action on public Community detail', async () => {
    const api: CommunityPostDetailApi = { ...actions(), getPost: vi.fn().mockResolvedValue(post()), listComments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(), createComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(), reportComment: vi.fn() };
    render(<MemoryRouter><CommunityPostDetailPageView api={api} postId={postId} authenticated currentUserId='A'/></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Share current content' }));
    expect(shared).toHaveBeenCalledExactlyOnceWith({ type: 'COMMUNITY_POST', id: postId });
  });
});
