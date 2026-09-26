import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
});
