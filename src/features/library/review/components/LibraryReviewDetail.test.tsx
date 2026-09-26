import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../../services/api-client';
import { LibraryReviewDetail } from './LibraryReviewDetail';
import type { LibraryReviewApiPort, LibraryReviewDetail as LibraryReviewDetailModel } from '../library-review.types';

afterEach(() => cleanup());

const detail: LibraryReviewDetailModel = {
  resource: {
    id: 'resource-1', resourceType: 'VOCABULARY', primaryLanguageCode: 'vi', secondaryLanguageCode: null, cefrLevel: 'A1', topics: ['greeting'],
    visibility: 'PUBLIC', moderationState: 'ACTIVE', reviewState: 'COMMUNITY_REVIEW', createdAt: '2026-09-26T10:00:00.000Z', updatedAt: '2026-09-26T10:00:00.000Z', provenanceRevision: 1,
    details: { resourceType: 'VOCABULARY', term: 'xin chào', definition: 'lời chào', partOfSpeech: null, exampleSentence: null },
  },
  provenance: [{
    id: 'prov-1', sourceType: 'ORIGINAL_AUTHOR', sourceId: 'source-1', sourceUrl: null, attribution: 'Người đóng góp', originalAuthorReference: null,
    license: { licenseKey: 'CC-BY-4.0', exists: true, displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true, redistributionAllowed: true, derivativeConstraints: null, active: true, eligibleForPublicVerification: true },
    sourceHealth: { applicable: false, valid: true, reason: null },
  }],
  reviewAuditHistory: [], contributionEvents: [], verificationEligibility: { eligible: true, issues: [] },
};

function makeApi(overrides: Partial<LibraryReviewApiPort> = {}): LibraryReviewApiPort {
  return {
    listReviewQueue: vi.fn(), listInvalidSourceQueue: vi.fn(), getReviewDetail: vi.fn(),
    transitionReview: vi.fn().mockResolvedValue({ resource: { id: 'resource-1', reviewState: 'REJECTED' }, audit: {} }),
    reconcileSource: vi.fn(), ...overrides,
  };
}

function renderDetail(api: LibraryReviewApiPort, value = detail, onRefresh = vi.fn().mockResolvedValue(undefined)) {
  return render(<MemoryRouter><LibraryReviewDetail api={api} detail={value} onRefresh={onRefresh} /></MemoryRouter>);
}

const invalidVerifiedDetail = {
  ...detail,
  resource: { ...detail.resource, reviewState: 'VERIFIED' as const },
  provenance: [{ ...detail.provenance[0], sourceType: 'PHASE06_LIBRARY_CANDIDATE', sourceHealth: { applicable: true, valid: false, reason: 'PARENT_NOT_PUBLIC' } }],
};

describe('LibraryReviewDetail', () => {
  it('disables Verify when Backend eligibility is false', () => {
    renderDetail(makeApi(), { ...detail, verificationEligibility: { eligible: false, issues: ['SOURCE_INVALID'] } });
    expect(screen.getByRole('button', { name: 'Xác minh' })).toBeDisabled();
    expect(screen.getByText('Có nguồn Phase 06 không còn hợp lệ')).toBeVisible();
  });

  it('requires a reject note and focuses the associated textarea', async () => {
    const user = userEvent.setup();
    renderDetail(makeApi());
    await user.click(screen.getByRole('button', { name: 'Từ chối' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
    const note = screen.getByLabelText('Ghi chú từ chối');
    expect(screen.getByText('Vui lòng ghi chú lý do từ chối trước khi tiếp tục.')).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(note));
  });

  it('focuses the success status after a successful Verify', async () => {
    const user = userEvent.setup();
    const api = makeApi();
    renderDetail(api);
    await user.click(screen.getByRole('button', { name: 'Xác minh' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xác minh' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveFocus();
    expect(api.transitionReview).toHaveBeenCalledWith('resource-1', { nextState: 'VERIFIED' });
  });

  it('restores focus to the Verify trigger after Cancel', async () => {
    const user = userEvent.setup();
    renderDetail(makeApi());
    const trigger = screen.getByRole('button', { name: 'Xác minh' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('restores focus to the Reject trigger after Escape', async () => {
    const user = userEvent.setup();
    renderDetail(makeApi());
    const trigger = screen.getByRole('button', { name: 'Từ chối' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('restores focus to the Reconcile trigger after Cancel', async () => {
    const user = userEvent.setup();
    renderDetail(makeApi(), invalidVerifiedDetail);
    const trigger = screen.getByRole('button', { name: 'Đưa về hàng chờ xem xét' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('renders nullable attribution requirements without inventing evidence', () => {
    renderDetail(makeApi());
    expect(screen.getByText('Yêu cầu ghi công')).toBeVisible();
    expect(screen.getByText('Có')).toBeVisible();

    cleanup();
    renderDetail(makeApi(), { ...detail, provenance: [{ ...detail.provenance[0], license: { ...detail.provenance[0].license, attributionRequired: false } }] });
    expect(screen.getByText('Không')).toBeVisible();

    cleanup();
    renderDetail(makeApi(), { ...detail, provenance: [{ ...detail.provenance[0], license: { ...detail.provenance[0].license, attributionRequired: null } }] });
    expect(screen.getByText('Chưa xác định')).toBeVisible();
  });

  it('maps source-still-valid without claiming reconciliation succeeded', async () => {
    const user = userEvent.setup();
    const api = makeApi({ reconcileSource: vi.fn().mockRejectedValue(new ApiClientError('valid', 409, 'LIBRARY_SOURCE_STILL_VALID')) });
    const invalidDetail = { ...detail, resource: { ...detail.resource, reviewState: 'VERIFIED' as const }, provenance: [{ ...detail.provenance[0], sourceType: 'PHASE06_LIBRARY_CANDIDATE', sourceHealth: { applicable: true, valid: false, reason: 'PARENT_NOT_PUBLIC' } }] };
    renderDetail(api, invalidDetail);
    await user.click(screen.getByRole('button', { name: 'Đưa về hàng chờ xem xét' }));
    await user.click(screen.getByRole('button', { name: 'Đưa về hàng chờ' }));
    expect(await screen.findByText('Nguồn đã hợp lệ trở lại. Không cần đưa tài nguyên về hàng chờ.')).toBeVisible();
    expect(screen.queryByText('Đã đưa tài nguyên về hàng chờ xem xét. Không có tự động xác minh lại.')).not.toBeInTheDocument();
  });

  it('maps self-verification denial without claiming success', async () => {
    const user = userEvent.setup();
    const api = makeApi({ transitionReview: vi.fn().mockRejectedValue(new ApiClientError('self', 403, 'LIBRARY_SELF_VERIFICATION_DENIED')) });
    renderDetail(api);
    await user.click(screen.getByRole('button', { name: 'Xác minh' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xác minh' }));
    expect(await screen.findByRole('status')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tải lại chi tiết' })).toBeVisible();
    expect(api.transitionReview).toHaveBeenCalledTimes(1);
  });

  it('surfaces a review conflict without retrying the mutation', async () => {
    const user = userEvent.setup();
    const transitionReview = vi.fn().mockRejectedValue(new ApiClientError('conflict', 409, 'LIBRARY_REVIEW_CONFLICT'));
    const api = makeApi({ transitionReview });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderDetail(api, detail, onRefresh);
    await user.click(screen.getByRole('button', { name: 'Xác minh' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xác minh' }));
    expect(await screen.findByRole('status')).toBeVisible();
    expect(transitionReview).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('keeps a reload path when conflict refresh fails', async () => {
    const user = userEvent.setup();
    const transitionReview = vi.fn().mockRejectedValue(new ApiClientError('conflict', 409, 'LIBRARY_REVIEW_CONFLICT'));
    const onRefresh = vi.fn().mockResolvedValue(false);
    const api = makeApi({ transitionReview });
    renderDetail(api, detail, onRefresh);
    await user.click(screen.getByRole('button', { name: 'Xác minh' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xác minh' }));
    expect(await screen.findByRole('status')).toBeVisible();
    const reload = screen.getByRole('button', { name: 'Tải lại chi tiết' });
    expect(reload).toBeVisible();
    await user.click(reload);
    expect(transitionReview).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Tải lại chi tiết' })).toBeVisible();
  });
});
