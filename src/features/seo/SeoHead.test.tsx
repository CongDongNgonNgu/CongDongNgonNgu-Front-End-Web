import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SeoHead } from './SeoHead';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('[data-seo-managed="true"], [data-seo-jsonld="true"]').forEach((element) => element.remove());
});

describe('SeoHead', () => {
  it('publishes one canonical, social metadata, and valid home structured data block', () => {
    render(<MemoryRouter initialEntries={['/']}><SeoHead /><span>content</span></MemoryRouter>);

    expect(document.title).toContain('Cộng đồng ngôn ngữ');
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    expect(document.head.querySelector('meta[property="og:url"]')).toHaveAttribute('content', expect.stringContaining('/'));
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('marks private routes noindex and removes public canonical/social signals', () => {
    render(<MemoryRouter initialEntries={['/admin']}><SeoHead /></MemoryRouter>);

    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
    expect(document.head.querySelector('meta[property="og:url"]')).not.toBeInTheDocument();
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0);
  });
});
