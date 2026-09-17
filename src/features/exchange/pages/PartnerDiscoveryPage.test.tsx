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
      'Bạn có thể hỗ trợ Tiếng Việt; họ đang muốn học Vietnamese.',
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
    expect(screen.getByText('Múi giờ tương thích.')).toBeVisible();
    expect(screen.getByText('Có khoảng thời gian học phù hợp.')).toBeVisible();
    expect(screen.getByRole('link', { name: /Xem hồ sơ công khai/ })).toHaveAttribute('href', '/profiles/candidate-1');
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
