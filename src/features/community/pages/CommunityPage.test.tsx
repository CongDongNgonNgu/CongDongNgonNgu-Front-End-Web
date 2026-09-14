import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityPageView, type CommunityPageApi } from './CommunityPage';
import type { CommunityPost } from '../community.types';
import type { LanguageCatalogItem } from '../../languages/languages.types';

afterEach(cleanup);

function post(id: string, overrides: Partial<CommunityPost> = {}): CommunityPost {
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
    content: 'A safe community post.',
    cefrLevel: 'B1',
    topic: 'daily practice',
    visibility: 'PUBLIC',
    createdAt: '2026-09-12T09:00:00.000Z',
    updatedAt: '2026-09-12T09:00:00.000Z',
    editedAt: null,
    canonicalPath: '/community/posts/' + id,
    isShareable: true,
    isOwner: false,
    helpfulCount: 0,
    viewerReacted: false,
    commentCount: 2,
    isSaved: false,
    ...overrides,
  };
}

const languages: LanguageCatalogItem[] = [
  {
    code: 'en',
    slug: 'english',
    nativeName: 'English',
    englishName: 'English',
    vietnameseName: 'Tiếng Anh',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 1,
  },
  {
    code: 'ja',
    slug: 'japanese',
    nativeName: '日本語',
    englishName: 'Japanese',
    vietnameseName: 'Tiếng Nhật',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 2,
  },
];

function createApi(responses: Array<{ items: CommunityPost[]; nextCursor: string | null }>): CommunityPageApi {
  const listPosts = vi.fn();
  responses.forEach((response) => listPosts.mockResolvedValueOnce(response));
  return {
    listPosts,
    createPost: vi.fn(),
    addHelpful: vi.fn(),
    removeHelpful: vi.fn(),
    savePost: vi.fn(),
    unsavePost: vi.fn(),
    getShareLink: vi.fn(),
    reportPost: vi.fn(),
  };
}

function LocationSearch() {
  const location = useLocation();
  return <output aria-label='location-search'>{location.search}</output>;
}

function renderPage(
  api: CommunityPageApi,
  authenticated = false,
  onAuthRequired = vi.fn(),
  initialEntries = ['/community'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CommunityPageView
        api={api}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
        authenticated={authenticated}
        onAuthRequired={onAuthRequired}
      />
      <LocationSearch />
    </MemoryRouter>,
  );
}

describe('CommunityPageView', () => {
  it('renders a public post as escaped plain text', async () => {
    const api = createApi([{
      items: [post('one', { content: '<script>alert(1)</script>\nGiữ nguyên xuống dòng.' })],
      nextCursor: null,
    }]);
    renderPage(api);

    expect(await screen.findByRole('heading', { name: 'Mới nhất' })).toBeVisible();
    const renderedContent = screen.getByText((_, element) => (
      element?.tagName === 'P'
      && element.textContent?.startsWith('<script>alert(1)</script>') === true
      && element.textContent.includes('\n')
    ));
    expect(renderedContent).toBeVisible();
    expect(screen.queryByRole('script')).not.toBeInTheDocument();
    expect(api.listPosts).toHaveBeenCalledWith({ languageCode: undefined, limit: 20 }, false);
  });

  it('passes the catalog language filter and opaque cursor to later feed requests', async () => {
    const api = createApi([
      { items: [post('one')], nextCursor: 'opaque-next' },
      { items: [post('one')], nextCursor: 'opaque-next' },
      { items: [post('two')], nextCursor: null },
    ]);
    const user = userEvent.setup();
    renderPage(api);

    const filter = await screen.findByLabelText('Theo ngôn ngữ');
    await user.selectOptions(filter, 'ja');
    await waitFor(() => expect(api.listPosts).toHaveBeenLastCalledWith(
      { languageCode: 'ja', limit: 20 },
      false,
    ));

    await user.click(await screen.findByRole('button', { name: 'Xem thêm' }));
    await waitFor(() => expect(api.listPosts).toHaveBeenLastCalledWith(
      { languageCode: 'ja', limit: 20, cursor: 'opaque-next' },
      false,
    ));
  });

  it('hydrates the language filter from and persists it to the URL', async () => {
    const api = createApi([
      { items: [post('one', { targetLanguage: { ...post('one').targetLanguage, code: 'ja', nativeName: '日本語', englishName: 'Japanese' } })], nextCursor: null },
      { items: [post('two')], nextCursor: null },
    ]);
    const user = userEvent.setup();
    renderPage(api, false, vi.fn(), ['/community?languageCode=ja']);

    const filter = await screen.findByRole('combobox');
    expect(filter).toHaveValue('ja');
    expect(api.listPosts).toHaveBeenCalledWith({ languageCode: 'ja', limit: 20 }, false);

    await user.selectOptions(filter, 'en');
    await waitFor(() => expect(screen.getByLabelText('location-search')).toHaveTextContent('?languageCode=en'));
  });

  it('uses authenticated post actions and only updates the confirmed helpful count', async () => {
    const api = createApi([{ items: [post('one')], nextCursor: null }]);
    vi.mocked(api.addHelpful).mockResolvedValue({ postId: 'one', type: 'HELPFUL', reacted: true, helpfulCount: 1 });
    const user = userEvent.setup();
    renderPage(api, true);

    await user.click(await screen.findByRole('button', { name: 'Đánh dấu hữu ích' }));
    await waitFor(() => expect(api.addHelpful).toHaveBeenCalledWith('one'));
    expect(await screen.findByText('1 lượt hữu ích')).toBeVisible();
  });

  it('sends unauthenticated composer intent to the existing login flow', async () => {
    const api = createApi([{ items: [], nextCursor: null }]);
    const onAuthRequired = vi.fn();
    const user = userEvent.setup();
    renderPage(api, false, onAuthRequired);

    await user.click(await screen.findByRole('button', { name: 'Đăng nhập để viết' }));
    expect(onAuthRequired).toHaveBeenCalledOnce();
  });
});
