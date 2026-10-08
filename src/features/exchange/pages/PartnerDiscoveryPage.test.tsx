import { UiLocaleProvider, useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { PartnerDiscoveryPageView } from './PartnerDiscoveryPage';
import type {
  DiscoveryCandidate,
  DiscoveryResponse,
  PartnerDiscoveryApi,
} from '../exchange.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const catalog: LanguageCatalogItem[] = [
  language('vi', 'Tiếng Việt', 'Vietnamese', 'Tiếng Việt', 10),
  language('en', 'English', 'English', 'Tiếng Anh', 20),
  language('ja', '日本語', 'Japanese', 'Tiếng Nhật', 30),
];

function candidate(id = 'candidate-1', overrides: Partial<DiscoveryCandidate> = {}): DiscoveryCandidate {
  return {
    user: { id, displayName: 'Người học cùng' },
    languages: [
      {
        code: 'en',
        slug: 'english',
        nativeName: 'English',
        englishName: 'English',
        vietnameseName: 'Tiếng Anh',
        direction: 'ltr',
        offered: true,
        wanted: false,
        declaredProficiency: 'C1',
        assessedProficiency: null,
      },
      {
        code: 'vi',
        slug: 'vietnamese',
        nativeName: 'Tiếng Việt',
        englishName: 'Vietnamese',
        vietnameseName: 'Tiếng Việt',
        direction: 'ltr',
        offered: false,
        wanted: true,
        declaredProficiency: 'A1',
        assessedProficiency: null,
      },
    ],
    goals: ['conversation'],
    interests: ['music'],
    normalizedScore: 0.86,
    reasons: [
      'Họ có thể hỗ trợ English; bạn đang muốn học English.',
      'Bạn có thể hỗ trợ Vietnamese; họ đang muốn học Vietnamese.',
      'Múi giờ tương thích.',
      'Có khoảng thời gian học phù hợp.',
    ],
    ...overrides,
  };
}

function response(candidates: DiscoveryCandidate[] = [candidate()], page = 1, totalPages = 1): DiscoveryResponse {
  return {
    scope: 'exchange-discovery',
    candidates,
    pagination: {
      page,
      pageSize: 6,
      totalItems: totalPages * 6,
      totalPages,
    },
    filters: {
      offeredLanguageCodes: [],
      wantedLanguageCodes: [],
      preferredPartnerLevels: [],
      matchingGoalCodes: [],
      matchingInterestCodes: [],
      timezoneCompatibility: 'ANY',
      page,
      pageSize: 6,
    },
  };
}

function renderPage(api: PartnerDiscoveryApi, authenticated = true) {
  return render(
    <MemoryRouter>
      <PartnerDiscoveryPageView api={api} authenticated={authenticated} />
    </MemoryRouter>,
  );
}

function makeApi(discoverResponse: DiscoveryResponse = response()): PartnerDiscoveryApi {
  return {
    listLanguages: vi.fn().mockResolvedValue(catalog),
    discover: vi.fn().mockResolvedValue(discoverResponse),
  };
}

describe('PartnerDiscoveryPageView', () => {
  it('renders loading, truthful reasons, safe fields and public profile entry', async () => {
    const api = makeApi();
    renderPage(api);

    expect(screen.getByRole('status', { name: 'Đang tải gợi ý học cùng' })).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Người học cùng' })).toBeVisible();
    expect(screen.getByText(/Chọn tín hiệu bạn muốn ưu tiên/).closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Múi giờ tương thích.')).toBeVisible();
    expect(screen.getByText('Có khoảng thời gian học phù hợp.')).toBeVisible();
    expect(screen.getByRole('link', { name: /Xem hồ sơ bạn cùng học/ })).toHaveAttribute('href', '/exchange/profile/candidate-1');
    const candidateArticle = screen.getByRole('article');
    expect(candidateArticle).not.toHaveTextContent(/email|@example|Ho_Chi_Minh|08:00/i);
    expect(api.discover).toHaveBeenCalledWith({
      offeredLanguageCodes: [],
      wantedLanguageCodes: [],
      preferredPartnerLevels: [],
      matchingGoalCodes: [],
      matchingInterestCodes: [],
      timezoneCompatibility: 'ANY',
      page: 1,
      pageSize: 6,
    });
  });

  it('applies language, level, topic and timezone filters through the API contract', async () => {
    const user = userEvent.setup();
    const api = makeApi();
    renderPage(api);

    await screen.findByRole('heading', { name: 'Người học cùng' });
    await user.selectOptions(screen.getByLabelText('Họ có thể hỗ trợ'), ['en']);
    await user.selectOptions(screen.getByLabelText('Họ muốn luyện'), ['vi']);
    await user.click(screen.getByRole('checkbox', { name: 'C1' }));
    await user.type(screen.getByLabelText('Mục tiêu chung'), 'conversation');
    await user.type(screen.getByLabelText('Sở thích chung'), 'music');
    await user.selectOptions(screen.getByLabelText('Múi giờ và thời gian'), 'WITHIN_3_HOURS');
    await user.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));

    await waitFor(() => expect(api.discover).toHaveBeenLastCalledWith({
      offeredLanguageCodes: ['en'],
      wantedLanguageCodes: ['vi'],
      preferredPartnerLevels: ['C1'],
      matchingGoalCodes: ['conversation'],
      matchingInterestCodes: ['music'],
      timezoneCompatibility: 'WITHIN_3_HOURS',
      page: 1,
      pageSize: 6,
    }));
  });

  it('requests the next deterministic page and preserves the result state', async () => {
    const user = userEvent.setup();
    const api: PartnerDiscoveryApi = {
      listLanguages: vi.fn().mockResolvedValue(catalog),
      discover: vi.fn()
        .mockResolvedValueOnce(response([candidate('candidate-1')], 1, 2))
        .mockResolvedValueOnce(response([candidate('candidate-2', { user: { id: 'candidate-2', displayName: 'Trang kế tiếp' } })], 2, 2)),
    };
    renderPage(api);

    expect(await screen.findByRole('heading', { name: 'Người học cùng' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sau' }));

    expect(await screen.findByRole('heading', { name: 'Trang kế tiếp' })).toBeVisible();
    expect(api.discover).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 6 }));
  });

  it('shows an explicit no-match state without fallback people', async () => {
    const api = makeApi(response([], 1, 0));
    renderPage(api);

    expect(await screen.findByText('Chưa có người phù hợp')).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows retry on a failed discovery request', async () => {
    const user = userEvent.setup();
    const api: PartnerDiscoveryApi = {
      listLanguages: vi.fn().mockResolvedValue(catalog),
      discover: vi.fn()
        .mockRejectedValueOnce(new Error('unavailable'))
        .mockResolvedValueOnce(response()),
    };
    renderPage(api);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải gợi ý học cùng');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: 'Người học cùng' })).toBeVisible();
  });

  it('asks unauthenticated visitors to sign in and does not invent results', async () => {
    const api = makeApi();
    renderPage(api, false);

    expect(screen.getByRole('heading', { name: 'Đăng nhập để tìm người học cùng' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
    expect(api.discover).not.toHaveBeenCalled();
  });
});

function language(
  code: string,
  nativeName: string,
  englishName: string,
  vietnameseName: string,
  sortOrder: number,
): LanguageCatalogItem {
  return {
    code,
    slug: code,
    nativeName,
    englishName,
    vietnameseName,
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder,
  };
}

function LocaleSwitch() { const { setLocale } = useUiLocale(); return <button onClick={() => setLocale('en')}>Switch English</button>; }

it('switches discovery copy without changing selected canonical filters, content or navigation', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  const data = response([candidate('opaque/user', { interests: ['my_music_文字'], goals: ['custom_goal'] })]);
  const api = makeApi(data);
  render(<UiLocaleProvider><MemoryRouter><LocaleSwitch /><PartnerDiscoveryPageView api={api} authenticated /></MemoryRouter></UiLocaleProvider>);
  await screen.findByRole('heading', { name: 'Người học cùng' });
  await user.selectOptions(screen.getByLabelText('Họ có thể hỗ trợ'), ['en']);
  await user.type(screen.getByLabelText('Mục tiêu chung'), 'conversation');
  await user.selectOptions(screen.getByLabelText('Múi giờ và thời gian'), 'SAME_TIMEZONE');
  const calls = vi.mocked(api.discover).mock.calls.length;
  await user.click(screen.getByRole('button', { name: 'Switch English' }));
  expect(screen.getByRole('heading', { name: 'Find a learning partner' })).toBeVisible();
  expect(screen.getByLabelText('They can support')).toHaveValue(['en']);
  expect(screen.getByLabelText('Shared goals')).toHaveValue('conversation');
  expect(screen.getByLabelText('Timezone and availability')).toHaveValue('SAME_TIMEZONE');
  expect(api.discover).toHaveBeenCalledTimes(calls);
  expect(screen.getByText('my_music_文字')).toBeVisible();
  expect(screen.getByText('custom_goal')).toBeVisible();
  expect(screen.getByText('Compatible timezones.')).toBeVisible();
  expect(screen.getByRole('link', { name: /View learning partner profile/ })).toHaveAttribute('href', '/exchange/profile/opaque%2Fuser');
  await user.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() => expect(api.discover).toHaveBeenLastCalledWith(expect.objectContaining({ offeredLanguageCodes: ['en'], matchingGoalCodes: ['conversation'], timezoneCompatibility: 'SAME_TIMEZONE' })));
  localStorage.clear();
});
it.each(['empty', 'error'] as const)('renders English discovery %s state', async (state) => {
  localStorage.setItem('congdongngonngu.ui-locale.v1', 'en');
  const api = makeApi(response([]));
  if (state === 'error') api.discover = vi.fn().mockRejectedValue(new Error('unsafe-private-detail'));
  render(<UiLocaleProvider><MemoryRouter><PartnerDiscoveryPageView api={api} authenticated /></MemoryRouter></UiLocaleProvider>);
  expect(await screen.findByRole('heading', { name: state === 'empty' ? 'No suitable partners yet' : 'Could not load learning partner suggestions' })).toBeVisible();
  expect(screen.queryByText('unsafe-private-detail')).not.toBeInTheDocument();
  localStorage.clear();
});
