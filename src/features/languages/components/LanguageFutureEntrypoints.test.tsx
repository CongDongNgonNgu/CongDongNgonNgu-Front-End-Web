import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageFutureEntrypoints } from './LanguageFutureEntrypoints';
import type { HubSectionAvailability } from '../languages.types';

afterEach(() => {
  cleanup();
});

function futureSections(overrides: Partial<Record<'community' | 'questions' | 'practice' | 'exchange', HubSectionAvailability>> = {}): HubSectionAvailability[] {
  const base = [
    { key: 'community', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'questions', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'practice', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
    { key: 'exchange', status: 'NOT_IMPLEMENTED', isNavigable: false, href: null },
  ] as const;
  return base.map((section) => overrides[section.key] ?? section);
}

describe('LanguageFutureEntrypoints', () => {
  it('renders all future capabilities as non-focusable unavailable states', () => {
    render(<MemoryRouter><LanguageFutureEntrypoints languageName='English' sections={futureSections()} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Không gian tương lai cho English' })).toBeVisible();
    expect(screen.getByText('Cộng đồng')).toBeVisible();
    expect(screen.getByText('Hỏi đáp và sửa lỗi')).toBeVisible();
    expect(screen.getByText('Luyện tập')).toBeVisible();
    expect(screen.getByText('Trao đổi')).toBeVisible();
    expect(screen.getAllByText('Chưa sẵn sàng')).toHaveLength(4);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('creates a link only when a capability is AVAILABLE, navigable and has an href', () => {
    render(
      <MemoryRouter>
        <LanguageFutureEntrypoints
          languageName='English'
          sections={futureSections({
            community: { key: 'community', status: 'AVAILABLE', isNavigable: true, href: '/languages/english/community' },
            practice: { key: 'practice', status: 'AVAILABLE', isNavigable: true, href: null },
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Cộng đồng/ })).toHaveAttribute('href', '/languages/english/community');
    expect(screen.queryByRole('link', { name: /Luyện tập/ })).not.toBeInTheDocument();
    expect(screen.getByText('Luyện tập').closest('[aria-disabled="true"]')).not.toBeNull();
  });

  it('keeps a long non-Latin language identity in the shared future surface', () => {
    render(<MemoryRouter><LanguageFutureEntrypoints languageName='中文语言学习社区的超长名称' sections={futureSections()} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /中文语言学习社区的超长名称/ })).toBeVisible();
  });
});
