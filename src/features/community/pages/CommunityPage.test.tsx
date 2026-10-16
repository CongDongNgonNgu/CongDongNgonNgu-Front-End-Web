import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
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
      <LocationSearch /><HistoryControls/>
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
    expect(api.listPosts).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', {name:'Áp dụng bộ lọc'}));
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

    const filter = await screen.findByLabelText('Theo ngôn ngữ');
    expect(filter).toHaveValue('ja');
    await waitFor(() => expect(api.listPosts).toHaveBeenCalledWith({ languageCode: 'ja', limit: 20 }, false));

    await user.selectOptions(filter, 'en');
    await user.click(screen.getByRole('button', {name:'Áp dụng bộ lọc'}));
    await waitFor(() => expect(screen.getByLabelText('location-search')).toHaveTextContent('?languageCode=en'));
  });

  it('uses authenticated post actions and only updates the confirmed helpful count', async () => {
    const api = createApi([{ items: [post('one')], nextCursor: null }]);
    vi.mocked(api.addHelpful).mockResolvedValue({ postId: 'one', type: 'HELPFUL', reacted: true, helpfulCount: 1 });
    const user = userEvent.setup();
    renderPage(api, true);

    await user.click(await screen.findByRole('button', { name: 'Đánh dấu hữu ích' }));
    await waitFor(() => expect(api.addHelpful).toHaveBeenCalledWith('one'));
    expect(await screen.findByRole('button', {name:'Bỏ đánh dấu hữu ích'})).toHaveAccessibleDescription('Hữu ích · 1');
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

function HistoryControls() {
  const navigate=useNavigate();
  return <><button onClick={()=>navigate(-1)}>Previous filters</button><button onClick={()=>navigate(1)}>Next filters</button></>;
}

it('applies combined database filters explicitly, derives QUESTION and resets through URL history', async () => {
  const api=createApi(Array.from({length:5},()=>({items:[],nextCursor:null})));
  const user=userEvent.setup();
  renderPage(api,true);
  await screen.findByRole('button',{name:'Áp dụng bộ lọc'});
  await user.type(screen.getByRole('searchbox',{name:'Tìm bài viết cộng đồng'}),'100%_ literal');
  await user.selectOptions(screen.getByLabelText('Theo ngôn ngữ'),'en');
  await user.click(screen.getByText('Bộ lọc khác'));
  await user.type(screen.getByLabelText('Chủ đề chính xác'),'Daily Practice');
  await user.selectOptions(screen.getByLabelText('Trạng thái câu hỏi'),'ACCEPTED');
  await user.selectOptions(screen.getByLabelText('Sắp xếp'),'USEFUL');
  await user.click(screen.getByLabelText('Chỉ bài viết tôi đã lưu'));
  expect(api.listPosts).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button',{name:'Áp dụng bộ lọc'}));
  await waitFor(()=>expect(api.listPosts).toHaveBeenLastCalledWith({q:'100%_ literal',languageCode:'en',postType:'QUESTION',topic:'daily-practice',responseState:'ACCEPTED',savedByMe:true,sort:'USEFUL',limit:20},true));
  expect(screen.getByLabelText('location-search')).toHaveTextContent('savedByMe=true');
  await user.click(screen.getByRole('button',{name:'Đặt lại'}));
  await waitFor(()=>expect(api.listPosts).toHaveBeenLastCalledWith({limit:20},true));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  await user.click(screen.getByRole('button',{name:'Previous filters'}));
  await waitFor(()=>expect(screen.getByRole('searchbox')).toHaveValue('100%_ literal'));
  await waitFor(()=>expect(api.listPosts).toHaveBeenLastCalledWith(expect.objectContaining({postType:'QUESTION',savedByMe:true}),true));
});

it.each(['sort=ACTIVITY','postType=DISCUSSION&responseState=ANSWERED','languageCode=zzz'])('blocks an invalid URL without relabelling its results and recovers on reset: %s', async (search) => {
  const api=createApi([{items:[],nextCursor:null}]);
  const user=userEvent.setup();
  renderPage(api,false,vi.fn(),['/community?'+search]);
  await screen.findByRole('alert');
  expect(api.listPosts).not.toHaveBeenCalled();
  expect(screen.queryByText('Chưa có bài viết nào')).toBeNull();
  await user.click(screen.getByRole('button',{name:'Đặt lại'}));
  await waitFor(()=>expect(api.listPosts).toHaveBeenCalledWith({limit:20},false));
});

it('requires sign-in for a saved URL and never sends an anonymous saved request', async () => {
  const api=createApi([]),onAuthRequired=vi.fn();
  const user=userEvent.setup();
  renderPage(api,false,onAuthRequired,['/community?savedByMe=true']);
  await user.click(await screen.findByRole('button',{name:'Đăng nhập để xem bài đã lưu'}));
  expect(onAuthRequired).toHaveBeenCalledOnce();
  expect(api.listPosts).not.toHaveBeenCalled();
});
