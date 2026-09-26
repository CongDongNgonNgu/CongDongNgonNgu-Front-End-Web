import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryReviewPageView } from './LibraryReviewPage';
import type { LibraryReviewApiPort } from '../library-review.types';
import type { AuthUser } from '../../../auth/auth.types';

afterEach(() => cleanup());

const moderator: AuthUser = {
  id: 'moderator-1', email: 'moderator@example.test', displayName: 'Moderator', status: 'ACTIVE', emailVerified: true, roles: ['MODERATOR'],
};
const member: AuthUser = { ...moderator, id: 'member-1', roles: ['MEMBER'] };
const admin: AuthUser = { ...moderator, id: 'admin-1', roles: ['ADMIN'] };

function makeApi(overrides: Partial<LibraryReviewApiPort> = {}): LibraryReviewApiPort {
  return {
    listReviewQueue: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    listInvalidSourceQueue: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getReviewDetail: vi.fn(),
    transitionReview: vi.fn(),
    reconcileSource: vi.fn(),
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  const from = typeof location.state === 'object' && location.state && 'from' in location.state ? String((location.state as { from?: unknown }).from) : '';
  return <output aria-label='location'>{location.pathname}|{from}</output>;
}

describe('LibraryReviewPage', () => {
  it('redirects unauthenticated reviewers with a safe return path', async () => {
    render(<MemoryRouter initialEntries={['/library/review?view=pending']}><Routes><Route path='/library/review' element={<LibraryReviewPageView api={makeApi()} authStatus='unauthenticated' user={null} />} /><Route path='/login' element={<LocationProbe />} /></Routes></MemoryRouter>);
    expect(await screen.findByLabelText('location')).toHaveTextContent('/login|/library/review?view=pending');
  });

  it('shows a non-reviewer denial surface for MEMBER', () => {
    render(<MemoryRouter><LibraryReviewPageView api={makeApi()} authStatus='authenticated' user={member} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Bạn chưa được cấp quyền kiểm duyệt.' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Tài nguyên cần một quyết định' })).not.toBeInTheDocument();
  });

  it('loads the pending queue for MODERATOR and keeps the cursor opaque', async () => {
    const api = makeApi({ listReviewQueue: vi.fn().mockResolvedValue({ items: [{
      resourceId: 'resource-1', resourceType: 'SENTENCE', primaryLanguageCode: 'vi', secondaryLanguageCode: null,
      cefrLevel: 'B1', topics: ['greeting'], reviewState: 'COMMUNITY_REVIEW', preview: { title: 'Xin chào', excerpt: 'Một câu mẫu.' },
      updatedAt: '2026-09-26T10:00:00.000Z', provenanceRevision: 1, provenance: [], verificationEligibility: { eligible: true, issues: [] },
    }], nextCursor: 'cursor-from-backend' }) });
    render(<MemoryRouter initialEntries={['/library/review?view=pending']}><LibraryReviewPageView api={api} authStatus='authenticated' user={moderator} /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: /Xin chào/ })).toBeVisible();
    expect(api.listReviewQueue).toHaveBeenCalledWith({ q: '', language: '', type: '', cursor: undefined, limit: 12 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xem thêm' })).toBeVisible());
  });

  it('allows ADMIN to load the source-invalid queue and append by opaque cursor', async () => {
    const api = makeApi({
      listInvalidSourceQueue: vi.fn()
        .mockResolvedValueOnce({ items: [{ resourceId: 'invalid-1', resourceType: 'SENTENCE', primaryLanguageCode: 'vi', preview: { title: 'Nguồn không còn hợp lệ', excerpt: 'Bị ẩn' }, reviewState: 'VERIFIED', updatedAt: '2026-09-26T10:00:00.000Z', provenanceRevision: 1, sourceHealth: [{ applicable: true, valid: false, reason: 'PARENT_NOT_PUBLIC' }], publicExposure: false }], nextCursor: 'opaque-next' })
        .mockResolvedValueOnce({ items: [{ resourceId: 'invalid-2', resourceType: 'VOCABULARY', primaryLanguageCode: 'vi', preview: { title: 'Nguồn thứ hai', excerpt: 'Bị ẩn' }, reviewState: 'VERIFIED', updatedAt: '2026-09-26T11:00:00.000Z', provenanceRevision: 1, sourceHealth: [{ applicable: true, valid: false, reason: 'CANDIDATE_INVALIDATED' }], publicExposure: false }], nextCursor: null }),
    });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/library/review?view=source-invalid']}><LibraryReviewPageView api={api} authStatus='authenticated' user={admin} /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: /Nguồn không còn hợp lệ/ })).toBeVisible();
    expect(api.listInvalidSourceQueue).toHaveBeenCalledWith({ cursor: undefined, limit: 12 });
    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));
    expect(await screen.findByRole('link', { name: /Nguồn thứ hai/ })).toBeVisible();
    expect(api.listInvalidSourceQueue).toHaveBeenNthCalledWith(2, { cursor: 'opaque-next', limit: 12 });
  });
});
