import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { LanguageExplorerPage } from './LanguageExplorerPage';
import type { LanguageCatalogItem } from '../languages.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function language(overrides: Partial<LanguageCatalogItem> = {}): LanguageCatalogItem {
  return {
    code: 'en',
    slug: 'english',
    nativeName: 'English',
    englishName: 'English',
    vietnameseName: 'Tiếng Anh',
    direction: 'ltr',
    active: true,
    launch: true,
    sortOrder: 20,
    ...overrides,
  };
}

const catalog = [
  language({ code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', sortOrder: 10 }),
  language({ code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', sortOrder: 20 }),
  language({ code: 'ja', slug: 'japanese', nativeName: '日本語', englishName: 'Japanese', vietnameseName: 'Tiếng Nhật', sortOrder: 30 }),
  language({ code: 'ko', slug: 'korean', nativeName: '한국어', englishName: 'Korean', vietnameseName: 'Tiếng Hàn', sortOrder: 40 }),
  language({ code: 'fr', slug: 'french', nativeName: 'Français', englishName: 'French', vietnameseName: 'Tiếng Pháp', sortOrder: 50 }),
  language({ code: 'de', slug: 'german', nativeName: 'Deutsch', englishName: 'German', vietnameseName: 'Tiếng Đức', sortOrder: 60 }),
  language({ code: 'es', slug: 'spanish', nativeName: 'Español', englishName: 'Spanish', vietnameseName: 'Tiếng Tây Ban Nha', sortOrder: 70 }),
  language({ code: 'zh', slug: 'chinese', nativeName: '中文', englishName: 'Chinese', vietnameseName: 'Tiếng Trung', sortOrder: 80 }),
  language({ code: 'pt', slug: 'portuguese', nativeName: 'Português', englishName: 'Portuguese', vietnameseName: 'Tiếng Bồ Đào Nha', sortOrder: 90 }),
];

function renderPage(api: { listLanguages: (search?: string) => Promise<LanguageCatalogItem[]> }) {
  return render(<MemoryRouter><LanguageExplorerPage api={api} /></MemoryRouter>);
}

describe('LanguageExplorerPage', () => {
  it('renders every language returned by the backend, including a future catalog item', async () => {
    const api = { listLanguages: vi.fn().mockResolvedValue(catalog) };
    renderPage(api);

    expect(await screen.findByRole('heading', { name: 'Khám phá ngôn ngữ' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Tiếng Việt/ })).toHaveAttribute('href', '/languages/vietnamese');
    expect(screen.getByRole('link', { name: /Português/ })).toHaveAttribute('href', '/languages/portuguese');
    expect(screen.getByText('9 ngôn ngữ')).toBeVisible();
  });

  it('uses the backend search contract and shows a truthful zero-result state', async () => {
    const user = userEvent.setup();
    const api = { listLanguages: vi.fn()
      .mockResolvedValueOnce(catalog)
      .mockResolvedValueOnce([]) };
    renderPage(api);

    const search = await screen.findByRole('searchbox', { name: 'Tìm ngôn ngữ' });
    await user.type(search, '日本語');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() => expect(api.listLanguages).toHaveBeenLastCalledWith('日本語'));
    expect(await screen.findByRole('status')).toHaveTextContent('Chưa tìm thấy ngôn ngữ phù hợp');
  });

  it('renders an API error with retry instead of inventing catalog data', async () => {
    const api = { listLanguages: vi.fn().mockRejectedValue(new ApiClientError('Unavailable', 503, 'HTTP_503')) };
    renderPage(api);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải danh sách ngôn ngữ');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    expect(screen.queryByRole('link', { name: /English/ })).not.toBeInTheDocument();
  });
});
