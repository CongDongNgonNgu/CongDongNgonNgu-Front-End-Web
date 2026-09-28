import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../../services/api-client';
import type { AuthUser } from '../../../auth/auth.types';
import type { LibraryReviewApiPort, LibraryReviewDetail as LibraryReviewDetailModel, LibraryReviewState } from '../library-review.types';
import { getLibraryReviewErrorMessage } from '../library-review.errors';
import { LibraryReviewDetailPageView } from './LibraryReviewDetailPage';

afterEach(() => cleanup());

const moderator: AuthUser = {
  id: 'moderator-1', email: 'moderator@example.test', displayName: 'Moderator', status: 'ACTIVE', emailVerified: true, roles: ['MODERATOR'],
};

function makeDetail(state: LibraryReviewState = 'COMMUNITY_REVIEW', title = 'xin chao', id = 'resource-1'): LibraryReviewDetailModel {
  const isInvalidSource = state === 'VERIFIED' && title.includes('invalid');
  return {
    resource: {
      id, resourceType: 'VOCABULARY', primaryLanguageCode: 'vi', secondaryLanguageCode: null, cefrLevel: 'A1', topics: ['greeting'],
      visibility: 'PUBLIC', moderationState: 'ACTIVE', reviewState: state, createdAt: '2026-09-26T10:00:00.000Z', updatedAt: '2026-09-26T10:00:00.000Z', provenanceRevision: 1,
      details: { resourceType: 'VOCABULARY', term: title, definition: 'a greeting', partOfSpeech: null, exampleSentence: null },
    },
    provenance: [{
      id: 'prov-1', sourceType: isInvalidSource ? 'PHASE06_LIBRARY_CANDIDATE' : 'ORIGINAL_AUTHOR', sourceId: 'source-1', sourceUrl: null, attribution: 'Contributor', originalAuthorReference: null,
      license: { licenseKey: 'CC-BY-4.0', exists: true, displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true, redistributionAllowed: true, derivativeConstraints: null, active: true, eligibleForPublicVerification: true },
      sourceHealth: isInvalidSource ? { applicable: true, valid: false, reason: 'PARENT_NOT_PUBLIC' } : { applicable: false, valid: true, reason: null },
    }],
    reviewAuditHistory: [], contributionEvents: [], verificationEligibility: { eligible: state === 'COMMUNITY_REVIEW' && !isInvalidSource, issues: isInvalidSource ? ['SOURCE_INVALID'] : [] },
  };
}

function makeApi(overrides: Partial<LibraryReviewApiPort> = {}): LibraryReviewApiPort {
  return {
    listReviewQueue: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    listInvalidSourceQueue: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getReviewDetail: vi.fn().mockResolvedValue(makeDetail()),
    transitionReview: vi.fn().mockResolvedValue({ resource: { id: 'resource-1', reviewState: 'VERIFIED' }, audit: {} }),
    reconcileSource: vi.fn().mockResolvedValue({ resource: { id: 'resource-1', reviewState: 'COMMUNITY_REVIEW' }, audit: {} }),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderPage(api: LibraryReviewApiPort, resourceId = 'resource-1') {
  return render(
    <MemoryRouter>
      <LibraryReviewDetailPageView api={api} authStatus='authenticated' user={moderator} resourceId={resourceId} />
    </MemoryRouter>,
  );
}

async function openVerifyAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /xác minh/i }));
  await user.click(screen.getByRole('button', { name: /xác nhận xác minh/i }));
}

describe('LibraryReviewDetailPage background refresh', () => {
  it('shows the initial skeleton, then keeps the detail mounted through a successful Verify refresh', async () => {
    const initial = deferred<LibraryReviewDetailModel>();
    const refresh = deferred<LibraryReviewDetailModel>();
    const getReviewDetail = vi.fn()
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(refresh.promise);
    const transitionReview = vi.fn().mockResolvedValue({ resource: { id: 'resource-1', reviewState: 'VERIFIED' }, audit: {} });
    const api = makeApi({ getReviewDetail, transitionReview });
    const user = userEvent.setup();

    renderPage(api);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    initial.resolve(makeDetail());
    expect(await screen.findByRole('heading', { name: 'xin chao' })).toBeVisible();

    await openVerifyAndConfirm(user);
    const status = await screen.findByRole('status');
    expect(status).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(status));
    expect(screen.getByRole('heading', { name: 'xin chao' })).toBeVisible();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    expect(transitionReview).toHaveBeenCalledTimes(1);

    refresh.resolve(makeDetail('VERIFIED', 'verified greeting'));
    expect(await screen.findByRole('heading', { name: 'verified greeting' })).toBeVisible();
    expect(screen.getByRole('status')).toBe(status);
    expect(screen.getByRole('status')).toBeVisible();
  });

  it('preserves a conflict notice and stale detail while the page refresh is pending', async () => {
    const refresh = deferred<LibraryReviewDetailModel>();
    const transitionReview = vi.fn().mockRejectedValue(new ApiClientError('conflict', 409, 'LIBRARY_REVIEW_CONFLICT'));
    const api = makeApi({
      getReviewDetail: vi.fn().mockResolvedValueOnce(makeDetail()).mockReturnValueOnce(refresh.promise),
      transitionReview,
    });
    const user = userEvent.setup();

    renderPage(api);
    expect(await screen.findByRole('heading', { name: 'xin chao' })).toBeVisible();
    await openVerifyAndConfirm(user);
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(getLibraryReviewErrorMessage(new ApiClientError('conflict', 409, 'LIBRARY_REVIEW_CONFLICT')));
    expect(screen.getByRole('heading', { name: 'xin chao' })).toBeVisible();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    expect(transitionReview).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(status));

    refresh.resolve(makeDetail('VERIFIED', 'conflict refreshed'));
    expect(await screen.findByRole('heading', { name: 'conflict refreshed' })).toBeVisible();
    expect(screen.getByRole('status')).toBe(status);
    expect(transitionReview).toHaveBeenCalledTimes(1);
  });

  it('preserves a source-still-valid notice while the page refresh is pending', async () => {
    const refresh = deferred<LibraryReviewDetailModel>();
    const validError = new ApiClientError('valid', 409, 'LIBRARY_SOURCE_STILL_VALID');
    const reconcileSource = vi.fn().mockRejectedValue(validError);
    const api = makeApi({
      getReviewDetail: vi.fn().mockResolvedValueOnce(makeDetail('VERIFIED', 'invalid source')).mockReturnValueOnce(refresh.promise),
      reconcileSource,
    });
    const user = userEvent.setup();

    renderPage(api);
    expect(await screen.findByRole('heading', { name: 'invalid source' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /đưa về hàng chờ xem xét/i }));
    await user.click(screen.getByRole('button', { name: /đưa về hàng chờ$/i }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(getLibraryReviewErrorMessage(validError));
    expect(screen.getByRole('heading', { name: 'invalid source' })).toBeVisible();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(status));

    refresh.resolve(makeDetail('VERIFIED', 'source is healthy'));
    expect(await screen.findByRole('heading', { name: 'source is healthy' })).toBeVisible();
    expect(screen.getByRole('status')).toBe(status);
    expect(reconcileSource).toHaveBeenCalledTimes(1);
  });

  it('keeps stale detail and notice after background refresh failure and leaves a retry path', async () => {
    const refreshFailure = new Error('temporary refresh failure');
    const transitionReview = vi.fn().mockRejectedValue(new ApiClientError('conflict', 409, 'LIBRARY_REVIEW_CONFLICT'));
    const getReviewDetail = vi.fn()
      .mockResolvedValueOnce(makeDetail())
      .mockRejectedValueOnce(refreshFailure)
      .mockRejectedValueOnce(refreshFailure);
    const api = makeApi({ getReviewDetail, transitionReview });
    const user = userEvent.setup();

    renderPage(api);
    expect(await screen.findByRole('heading', { name: 'xin chao' })).toBeVisible();
    await openVerifyAndConfirm(user);
    expect(await screen.findByRole('button', { name: 'Tải lại chi tiết' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'xin chao' })).toBeVisible();
    expect(screen.queryByText(/không thể tải chi tiết kiểm duyệt/i)).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tải lại chi tiết' }));
    expect(getReviewDetail).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: 'Tải lại chi tiết' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'xin chao' })).toBeVisible();
    expect(transitionReview).toHaveBeenCalledTimes(1);
  });

  it('shows the initial error when the first detail request fails', async () => {
    const api = makeApi({ getReviewDetail: vi.fn().mockRejectedValue(new Error('initial failure')) });
    renderPage(api);

    expect(await screen.findByText(/không thể tải chi tiết kiểm duyệt/i)).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  it('resets the old detail before loading a different resource id', async () => {
    const next = deferred<LibraryReviewDetailModel>();
    const getReviewDetail = vi.fn().mockResolvedValueOnce(makeDetail('COMMUNITY_REVIEW', 'resource a', 'resource-a'));
    const api = makeApi({ getReviewDetail });
    const view = renderPage(api, 'resource-a');
    expect(await screen.findByRole('heading', { name: 'resource a' })).toBeVisible();

    getReviewDetail.mockReturnValueOnce(next.promise);
    view.rerender(
      <MemoryRouter>
        <LibraryReviewDetailPageView api={api} authStatus='authenticated' user={moderator} resourceId='resource-b' />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('heading', { name: 'resource a' })).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    next.resolve(makeDetail('COMMUNITY_REVIEW', 'resource b', 'resource-b'));
    expect(await screen.findByRole('heading', { name: 'resource b' })).toBeVisible();
  });

  it('keeps success status focus for Reject and Reconcile background refreshes', async () => {
    const rejectRefresh = deferred<LibraryReviewDetailModel>();
    const rejectApi = makeApi({
      getReviewDetail: vi.fn().mockResolvedValueOnce(makeDetail()).mockReturnValueOnce(rejectRefresh.promise),
    });
    const user = userEvent.setup();
    renderPage(rejectApi);
    expect(await screen.findByRole('heading', { name: 'xin chao' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /từ chối/i }));
    fireEvent.change(screen.getByLabelText(/ghi chú từ chối/i), { target: { value: 'insufficient evidence' } });
    await user.click(screen.getByRole('button', { name: /xác nhận từ chối/i }));
    const rejectStatus = await screen.findByRole('status');
    await waitFor(() => expect(document.activeElement).toBe(rejectStatus));
    rejectRefresh.resolve(makeDetail('REJECTED', 'rejected greeting'));
    expect(await screen.findByRole('heading', { name: 'rejected greeting' })).toBeVisible();
    expect(screen.getByRole('status')).toBe(rejectStatus);
    expect(screen.getByRole('status')).toHaveFocus();

    cleanup();
    const reconcileRefresh = deferred<LibraryReviewDetailModel>();
    const reconcileApi = makeApi({
      getReviewDetail: vi.fn().mockResolvedValueOnce(makeDetail('VERIFIED', 'invalid source')).mockReturnValueOnce(reconcileRefresh.promise),
    });
    renderPage(reconcileApi);
    expect(await screen.findByRole('heading', { name: 'invalid source' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /đưa về hàng chờ xem xét/i }));
    await user.click(screen.getByRole('button', { name: /đưa về hàng chờ$/i }));
    const reconcileStatus = await screen.findByRole('status');
    await waitFor(() => expect(document.activeElement).toBe(reconcileStatus));
    reconcileRefresh.resolve(makeDetail('COMMUNITY_REVIEW', 'reconciled greeting'));
    expect(await screen.findByRole('heading', { name: 'reconciled greeting' })).toBeVisible();
    expect(screen.getByRole('status')).toBe(reconcileStatus);
    expect(screen.getByRole('status')).toHaveFocus();
  });
});
