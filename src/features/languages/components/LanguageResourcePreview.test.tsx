import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageResourcePreview } from './LanguageResourcePreview';
import type { HubSectionAvailability, LanguageResourcePreviewItem } from '../languages.types';

afterEach(() => {
  cleanup();
});

function resourceSections(overrides: Partial<Record<'vocabulary' | 'grammar' | 'sentences' | 'pronunciation' | 'resources', HubSectionAvailability>> = {}): HubSectionAvailability[] {
  const base = [
    { key: 'vocabulary', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'grammar', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'sentences', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'pronunciation', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'resources', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
  ] as const;
  return base.map((section) => overrides[section.key] ?? section);
}

describe('LanguageResourcePreview', () => {
  it('renders a legitimate future resource model only when its capability is available', () => {
    const items: LanguageResourcePreviewItem[] = [
      {
        id: 'vocabulary-travel-a1',
        type: 'vocabulary',
        title: 'Travel words for everyday conversations',
        shortDescription: 'A reviewed collection for simple travel contexts.',
        level: 'A1',
        topic: 'travel',
        href: '/languages/english/vocabulary/travel',
      },
    ];

    render(
      <MemoryRouter>
        <LanguageResourcePreview
          languageName='English'
          sections={resourceSections({
            vocabulary: { key: 'vocabulary', status: 'AVAILABLE', isNavigable: true, href: '/languages/:slug/vocabulary' },
          })}
          items={items}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tài nguyên học tập cho English' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Travel words for everyday conversations/ })).toHaveAttribute('href', '/languages/english/vocabulary/travel');
    expect(screen.getByText('A1')).toBeVisible();
  });

  it('renders a truthful empty state for NOT_IMPLEMENTED production capabilities', () => {
    render(<MemoryRouter><LanguageResourcePreview languageName='English' sections={resourceSections()} /></MemoryRouter>);

    expect(screen.getByRole('status')).toHaveTextContent('Chưa có tài nguyên học tập');
    expect(screen.getByText('Nội dung sẽ xuất hiện khi dữ liệu cộng đồng được kiểm duyệt và sẵn sàng.')).toBeVisible();
    expect(screen.getByText('Từ vựng')).toBeVisible();
    expect(screen.getAllByText('Chưa sẵn sàng')[0]).toBeVisible();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not render supplied preview data when the backend capability is unavailable', () => {
    const items: LanguageResourcePreviewItem[] = [
      {
        id: 'fixture-only',
        type: 'grammar',
        title: 'Development fixture must stay hidden',
        shortDescription: 'This item is never production content.',
        href: '/languages/english/grammar/fixture-only',
      },
    ];

    render(<MemoryRouter><LanguageResourcePreview languageName='English' sections={resourceSections()} items={items} /></MemoryRouter>);

    expect(screen.queryByText('Development fixture must stay hidden')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có tài nguyên học tập');
  });

  it('keeps long and non-Latin language names and resource labels readable', () => {
    const items: LanguageResourcePreviewItem[] = [
      {
        id: 'japanese-long-title',
        type: 'resources',
        title: '日本語のとても長い学習資料タイトル',
        shortDescription: 'CJK resource description remains visible without fake metadata.',
      },
    ];

    render(
      <MemoryRouter>
        <LanguageResourcePreview
          languageName='日本語のためのとても長い言語カタログ名'
          sections={resourceSections({
            resources: { key: 'resources', status: 'AVAILABLE', isNavigable: true, href: '/languages/:slug/resources' },
          })}
          items={items}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /日本語のためのとても長い言語カタログ名/ })).toBeVisible();
    expect(screen.getByText('日本語のとても長い学習資料タイトル')).toBeVisible();
  });
});
