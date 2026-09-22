import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryExplorerPageView } from './LibraryExplorerPage';
import { LibraryResourceDetailPage } from './LibraryResourceDetailPage';
import type { LibraryPublicResource, LibraryPublicSearchItem } from '../library.types';
import type { LibrarySearchApiPort } from '../hooks/useLibrarySearch';
import type { LibraryResourceApiPort } from '../hooks/useLibraryResource';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

const languages = [
  {
    code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr' as const, active: true, launch: true, sortOrder: 1,
  },
  {
    code: 'zh', slug: 'chinese', nativeName: '中文', englishName: 'Chinese', vietnameseName: 'Tiếng Trung', direction: 'ltr' as const, active: true, launch: true, sortOrder: 2,
  },
];

function searchItem(id: string, overrides: Partial<LibraryPublicSearchItem> = {}): LibraryPublicSearchItem {
  return {
    id,
    resourceType: 'VOCABULARY',
    primaryLanguageCode: 'vi',
    secondaryLanguageCode: null,
    cefrLevel: 'A1',
    topics: ['daily-life'],
    reviewState: 'VERIFIED',
    preview: { title: 'xin chào', excerpt: 'A safe public resource.' },
    provenance: [{
      attribution: 'Community attribution',
      license: {
        licenseKey: 'CC-BY-4.0',
        displayName: 'CC BY 4.0',
        canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/',
        attributionRequired: true,
        redistributionAllowed: true,
        derivativeConstraints: null,
      },
    }],
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
    ...overrides,
  };
}

function renderExplorer(api: LibrarySearchApiPort, initialEntries = ['/library']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes><Route path='/library' element={<LibraryExplorerPageView api={api} catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }} />} /></Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label='location-search'>{location.search}</output>;
}

describe('Library explorer pages', () => {
  it('hydrates URL filters, renders mixed public rows, and carries the cursor into load more', async () => {
    const listResources = vi.fn()
      .mockResolvedValueOnce({ items: [searchItem('one'), searchItem('two', { resourceType: 'SENTENCE', preview: { title: '你好', excerpt: 'A sentence.' } })], nextCursor: 'opaque-next' })
      .mockResolvedValueOnce({ items: [searchItem('three', { resourceType: 'TRANSLATION', preview: { title: 'three', excerpt: 'A safe public resource.' } })], nextCursor: null })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const api = { listResources };
    const user = userEvent.setup();
    renderExplorer(api, ['/library?q=chào&language=vi']);

    expect(await screen.findByText('xin chào')).toBeVisible();
    expect(screen.getByText('你好')).toBeVisible();
    await waitFor(() => expect(listResources).toHaveBeenCalledWith({
      q: 'chào', language: 'vi', type: '', topic: '', level: '', limit: 20,
    }));

    await user.click(await screen.findByRole('button', { name: 'Xem thêm tài nguyên' }));
    await waitFor(() => expect(listResources).toHaveBeenLastCalledWith({
      q: 'chào', language: 'vi', type: '', topic: '', level: '', limit: 20, cursor: 'opaque-next',
    }));
    expect(await screen.findByText('three')).toBeVisible();

    const level = screen.getByLabelText('Trình độ CEFR');
    await user.selectOptions(level, 'B1');
    await waitFor(() => expect(screen.getByLabelText('location-search')).toHaveTextContent('q=ch%C3%A0o&language=vi&level=B1'));
  });

  it('uses a focus-managed mobile filter drawer and returns focus on Escape', async () => {
    const api = { listResources: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const user = userEvent.setup();
    renderExplorer(api);

    const trigger = await screen.findByRole('button', { name: 'Bộ lọc' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Bộ lọc tìm kiếm' });
    expect(within(dialog).getByRole('button', { name: 'Đóng bộ lọc' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Bộ lọc tìm kiếm' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps drawer focus stable while changing a filter and restores body overflow on close', async () => {
    const api = { listResources: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const user = userEvent.setup();
    document.body.style.overflow = 'scroll';
    renderExplorer(api);

    const trigger = await screen.findByRole('button', { name: 'Bộ lọc' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Bộ lọc tìm kiếm' });
    const language = within(dialog).getByLabelText('Ngôn ngữ');

    expect(document.body.style.overflow).toBe('hidden');
    await user.selectOptions(language, 'vi');

    expect(screen.getByRole('dialog', { name: 'Bộ lọc tìm kiếm' })).toBeInTheDocument();
    expect(language).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    const closeButton = within(dialog).getByRole('button', { name: 'Đóng bộ lọc' });
    within(dialog).getByRole('button', { name: 'Xem kết quả' }).focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('restores body overflow when the open drawer unmounts', async () => {
    const api = { listResources: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const user = userEvent.setup();
    document.body.style.overflow = 'auto';
    renderExplorer(api);

    await user.click(await screen.findByRole('button', { name: 'Bộ lọc' }));
    expect(document.body.style.overflow).toBe('hidden');
    cleanup();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('applies topic changes on Enter or blur instead of requesting per keystroke', async () => {
    const api = { listResources: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const user = userEvent.setup();
    renderExplorer(api);
    await waitFor(() => expect(api.listResources).toHaveBeenCalledTimes(1));
    api.listResources.mockClear();

    const topic = screen.getByPlaceholderText('Ví dụ: travel');
    await user.type(topic, 'greetings');
    expect(api.listResources).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    await waitFor(() => expect(api.listResources).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('location-search')).toHaveTextContent('topic=greetings');
  });

  it('shows a recoverable error state and an explicit empty state', async () => {
    const failingApi = { listResources: vi.fn().mockRejectedValue(new Error('offline')) };
    renderExplorer(failingApi);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải thư viện');

    cleanup();
    const emptyApi = { listResources: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    renderExplorer(emptyApi);
    expect(await screen.findByText('Chưa có tài nguyên phù hợp')).toBeVisible();
  });
});

const detailResource: LibraryPublicResource = {
  id: 'detail-1',
  resourceType: 'VOCABULARY',
  primaryLanguageCode: 'vi',
  secondaryLanguageCode: null,
  cefrLevel: 'A1',
  topics: ['daily-life'],
  reviewState: 'VERIFIED',
  details: {
    resourceType: 'VOCABULARY',
    term: 'từ điển',
    definition: 'A public dictionary resource.',
    partOfSpeech: 'noun',
    exampleSentence: 'Tôi mở từ điển.',
  },
  provenance: [{
    sourceType: 'ORIGINAL_AUTHOR',
    sourceId: 'public-source-1',
    sourceUrl: null,
    originalAuthorReference: null,
    attribution: 'Original contributor',
    license: {
      licenseKey: 'CC-BY-4.0',
      displayName: 'CC BY 4.0',
      canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attributionRequired: true,
      redistributionAllowed: true,
      derivativeConstraints: null,
    },
  }],
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
};

describe('Library resource detail page', () => {
  it('renders read-only content and safe license cues without internal metadata', async () => {
    const api: LibraryResourceApiPort = { getResource: vi.fn().mockResolvedValue(detailResource) };
    render(
      <MemoryRouter initialEntries={['/library/detail-1']}>
        <Routes><Route path='/library/:resourceId' element={<LibraryResourceDetailPage api={api} />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'từ điển' })).toBeVisible();
    expect(screen.getByText('Original contributor')).toBeVisible();
    expect(screen.getByText('CC BY 4.0')).toBeVisible();
    expect(screen.getAllByText('A public dictionary resource.')[0]).toBeVisible();
    expect(screen.queryByText('public-source-1')).not.toBeInTheDocument();
  });
});
