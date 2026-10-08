import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryRelatedResources } from './LibraryRelatedResources';
import { UiLocaleProvider, useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { LibraryPublicResource } from '../library.types';

const target: LibraryPublicResource = {
  id: 'public-related-target', resourceType: 'VOCABULARY', primaryLanguageCode: 'vi', secondaryLanguageCode: null, cefrLevel: 'A1', topics: ['greetings'], reviewState: 'VERIFIED',
  details: { resourceType: 'VOCABULARY', term: 'xin chào', definition: 'A public greeting.', exampleSentence: null, partOfSpeech: null },
  provenance: [{ sourceType: 'ORIGINAL_AUTHOR', sourceId: 'test-only-source', sourceUrl: 'https://example.org/original', originalAuthorReference: null, attribution: 'Original reviewed author',
    license: { licenseKey: 'CC-BY-4.0', displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true, redistributionAllowed: true, derivativeConstraints: null } }],
  createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z',
};
const catalogApi = { listLanguages: vi.fn().mockResolvedValue([{ code: 'vi', nativeName: 'Tiếng Việt' }]) };
function LocaleSwitch() { const { setLocale } = useUiLocale(); return <button onClick={() => setLocale('en')}>English</button>; }
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

describe('Related Resources bounded Library journey', () => {
  it('renders fixed relation labels separately from canonical provenance and keeps content language during locale switching', async () => {
    const api = { getRelatedResources: vi.fn().mockResolvedValue({ items: [{ resource: target, relation: { type: 'SAME_CONCEPT' } }], nextCursor: null }) };
    const user = userEvent.setup();
    render(<UiLocaleProvider><MemoryRouter><LocaleSwitch /><LibraryRelatedResources resourceId='anchor' api={api} catalogApi={catalogApi} /></MemoryRouter></UiLocaleProvider>);
    const title = await screen.findByRole('link', { name: 'xin chào' });
    expect(title).toHaveAttribute('href', '/library/public-related-target');
    expect(title).toHaveAttribute('lang', 'vi');
    expect(screen.getByText('Cùng khái niệm', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('Original reviewed author')).toBeVisible();
    expect(screen.getByText('CC BY 4.0')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Nguồn gốc ↗' })).toHaveAttribute('href', 'https://example.org/original');
    expect(screen.queryByText('test-only-source')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Ngôn ngữ'), 'vi');
    await waitFor(() => expect(api.getRelatedResources).toHaveBeenLastCalledWith('anchor', expect.objectContaining({ language: 'vi' })));
    await screen.findByRole('link', { name: 'xin chào' });
    const previousCalls = api.getRelatedResources.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByLabelText('Content language')).toHaveValue('vi');
    expect(screen.getByText('Same concept', { selector: 'strong' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'xin chào' })).toHaveAttribute('lang', 'vi');
    expect(api.getRelatedResources).toHaveBeenCalledTimes(previousCalls);
  });

  it('shows honest empty and bounded continuation without manufacturing a relation, preserving lexical search', async () => {
    const api = { getRelatedResources: vi.fn().mockResolvedValueOnce({ items: [], nextCursor: 'next-bounded-scan' }).mockResolvedValueOnce({ items: [], nextCursor: null }) };
    const user = userEvent.setup();
    render(<MemoryRouter><LibraryRelatedResources resourceId='anchor' api={api} catalogApi={catalogApi} /></MemoryRouter>);
    expect(await screen.findByText('Chưa có tài nguyên liên quan phù hợp')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tìm trong thư viện' })).toHaveAttribute('href', '/library');
    await user.click(screen.getByRole('button', { name: 'Xem trang liên quan tiếp theo' }));
    await waitFor(() => expect(api.getRelatedResources).toHaveBeenLastCalledWith('anchor', { limit: 3, cursor: 'next-bounded-scan' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Xem trang liên quan tiếp theo' })).not.toBeInTheDocument());
  });

  it('uses generic recoverable errors without showing server text or stale cards', async () => {
    const api = { getRelatedResources: vi.fn().mockResolvedValueOnce({ items: [{ resource: target, relation: { type: 'FOLLOW_UP' } }], nextCursor: null }).mockRejectedValueOnce(new Error('private database payload')).mockResolvedValueOnce({ items: [], nextCursor: null }) };
    const user = userEvent.setup();
    render(<MemoryRouter><LibraryRelatedResources resourceId='anchor' api={api} catalogApi={catalogApi} /></MemoryRouter>);
    await screen.findByRole('link', { name: 'xin chào' });
    await user.click(screen.getByRole('button', { name: 'Làm mới liên kết' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không thể tải tài nguyên liên quan');
    expect(screen.queryByRole('link', { name: 'xin chào' })).not.toBeInTheDocument();
    expect(screen.queryByText('private database payload')).not.toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có tài nguyên liên quan phù hợp')).toBeVisible();
  });
});
