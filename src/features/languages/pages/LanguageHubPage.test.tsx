import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { LanguageHubPage } from './LanguageHubPage';
import type { LanguageCatalogItem, LanguageHubOverview } from '../languages.types';
import type { LanguageHubApi } from './LanguageHubPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const english: LanguageCatalogItem = {
  code: 'en',
  slug: 'english',
  nativeName: 'English',
  englishName: 'English',
  vietnameseName: 'Tiếng Anh',
  direction: 'ltr',
  active: true,
  launch: true,
  sortOrder: 20,
};

const launchLanguages: LanguageCatalogItem[] = [
  {
    code: 'vi',
    slug: 'vietnamese',
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    vietnameseName: 'Tiếng Việt',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 10,
  },
  english,
  {
    code: 'zh',
    slug: 'chinese',
    nativeName: '中文',
    englishName: 'Chinese',
    vietnameseName: 'Tiếng Trung',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 30,
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
    sortOrder: 40,
  },
  {
    code: 'ko',
    slug: 'korean',
    nativeName: '한국어',
    englishName: 'Korean',
    vietnameseName: 'Tiếng Hàn',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 50,
  },
  {
    code: 'fr',
    slug: 'french',
    nativeName: 'Français',
    englishName: 'French',
    vietnameseName: 'Tiếng Pháp',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 60,
  },
  {
    code: 'de',
    slug: 'german',
    nativeName: 'Deutsch',
    englishName: 'German',
    vietnameseName: 'Tiếng Đức',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 70,
  },
  {
    code: 'es',
    slug: 'spanish',
    nativeName: 'Español',
    englishName: 'Spanish',
    vietnameseName: 'Tiếng Tây Ban Nha',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 80,
  },
];

const overview: LanguageHubOverview = {
  language: english,
  seo: {
    title: 'English | CongDongNgonNgu.vn',
    description: 'Không gian học tiếng Anh.',
    canonicalPath: '/languages/english',
  },
  metrics: {
    learnerCount: { state: 'NOT_AVAILABLE_YET', value: null },
    contributorCount: { state: 'NOT_AVAILABLE_YET', value: null },
    resourceCount: { state: 'NOT_AVAILABLE_YET', value: null },
  },
  sections: [
    { key: 'overview', status: 'AVAILABLE', isNavigable: true, href: '/languages/english' },
    { key: 'vocabulary', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'grammar', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'sentences', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'pronunciation', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'resources', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'community', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'questions', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'practice', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'exchange', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
  ],
  filters: {
    levels: ['B2'],
    topic: 'travel',
    levelOptions: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    levelRequired: false,
    topicState: 'NOT_AVAILABLE_YET',
  },
};

function overviewFor(language: LanguageCatalogItem): LanguageHubOverview {
  return {
    ...overview,
    language,
    seo: {
      ...overview.seo,
      title: `${language.nativeName} | CongDongNgonNgu.vn`,
      canonicalPath: `/languages/${language.slug}`,
    },
    sections: overview.sections.map((section) => section.key === 'overview' ? { ...section, href: `/languages/${language.slug}` } : section),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label='location'>{location.search}</output>;
}

function renderPage(api: LanguageHubApi, initialEntry = '/languages/english?level=B2&topic=Travel') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/languages/:slug' element={<><LanguageHubPage api={api} /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LanguageHubPage', () => {
  it('loads the generic hub from the slug and URL filters, preserving truthful unavailable states', async () => {
    const api: LanguageHubApi = {
      getLanguage: vi.fn().mockResolvedValue(english),
      getOverview: vi.fn().mockResolvedValue(overview),
    };
    renderPage(api);

    expect(await screen.findByRole('heading', { name: 'English' })).toBeVisible();
    expect(api.getLanguage).toHaveBeenCalledWith('english');
    expect(api.getOverview).toHaveBeenCalledWith('english', { levels: ['B2'], topic: 'travel' });
    expect(screen.getAllByText('Chưa khả dụng')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Từ vựng/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('href', '/languages/english');
    expect(screen.getByRole('heading', { name: 'Tài nguyên học tập cho English' })).toBeVisible();
    expect(screen.getByText('Chưa có tài nguyên học tập')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Không gian tương lai cho English' })).toBeVisible();
    expect(screen.getAllByText('Cộng đồng').some((node) => node.closest('[aria-disabled=true]'))).toBe(true);
    expect(screen.queryByRole('link', { name: /Cộng đồng/ })).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('writes level and topic choices to the URL so back/forward can restore them', async () => {
    const user = userEvent.setup();
    const api = {
      getLanguage: vi.fn().mockResolvedValue(english),
      getOverview: vi.fn().mockResolvedValue(overview),
    };
    renderPage(api);
    await screen.findByRole('heading', { name: 'English' });

    await user.click(screen.getByRole('button', { name: 'A1' }));
    expect(screen.getByRole('status', { name: 'URL bộ lọc' })).toHaveTextContent('?level=A1%2CB2&topic=travel');

    const topic = screen.getByRole('textbox', { name: 'Chủ đề' });
    await user.clear(topic);
    await user.type(topic, 'Space Opera');
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

    await waitFor(() => expect(screen.getByRole('status', { name: 'URL bộ lọc' })).toHaveTextContent('?level=A1%2CB2&topic=space-opera'));
    expect(api.getOverview).toHaveBeenLastCalledWith('english', { levels: ['A1', 'B2'], topic: 'space-opera' });
  });

  it('maps a missing language contract error to a navigable not-found state', async () => {
    const api = {
      getLanguage: vi.fn().mockRejectedValue(new ApiClientError('Missing', 404, 'LANGUAGE_NOT_FOUND')),
      getOverview: vi.fn().mockRejectedValue(new ApiClientError('Missing', 404, 'LANGUAGE_NOT_FOUND')),
    };
    renderPage(api, '/languages/unknown');

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy ngôn ngữ' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Quay lại khám phá' })).toHaveAttribute('href', '/languages');
  });

  it.each(launchLanguages.map((language) => [language.slug, language] as const))('reconciles the same truthful Hub surfaces for %s', async (_slug, language) => {
    const api: LanguageHubApi = {
      getLanguage: vi.fn().mockResolvedValue(language),
      getOverview: vi.fn().mockResolvedValue(overviewFor(language)),
    };
    renderPage(api, `/languages/${language.slug}`);

    expect(await screen.findByRole('heading', { name: language.nativeName })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('href', `/languages/${language.slug}`);
    expect(screen.getByRole('heading', { name: `Tài nguyên học tập cho ${language.nativeName}` })).toBeVisible();
    expect(screen.getByRole('heading', { name: `Không gian tương lai cho ${language.nativeName}` })).toBeVisible();
    expect(screen.getByRole('button', { name: /Từ vựng/ })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Cộng đồng/ })).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
