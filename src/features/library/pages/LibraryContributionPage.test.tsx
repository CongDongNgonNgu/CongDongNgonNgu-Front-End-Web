import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../services/api-client';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { LibraryContributionPageView } from './LibraryContributionPage';
import type { LibraryContributionApiPort, LibraryContributionPolicy } from '../library.contribution.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const languages: LanguageCatalogItem[] = [
  { code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr', active: true, launch: true, sortOrder: 1 },
  { code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', direction: 'ltr', active: true, launch: true, sortOrder: 2 },
];

const policy: LibraryContributionPolicy = {
  termsVersion: 'server-v2',
  approvedResourceTypes: ['VOCABULARY', 'SENTENCE', 'TRANSLATION', 'GRAMMAR_ITEM'],
  licenses: [{
    licenseKey: 'CC-BY-4.0',
    displayName: 'CC BY 4.0',
    canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attributionRequired: true,
    redistributionAllowed: true,
    derivativeConstraints: 'Cho phép tác phẩm phái sinh nếu ghi công.',
  }],
};

function makeApi(overrides: Partial<LibraryContributionApiPort> = {}): LibraryContributionApiPort {
  return {
    getPolicy: vi.fn().mockResolvedValue(policy),
    createResource: vi.fn().mockResolvedValue({ id: 'resource-1' }),
    attachProvenance: vi.fn().mockResolvedValue({ id: 'provenance-1' }),
    submitContribution: vi.fn().mockResolvedValue({ resource: { id: 'resource-1', reviewState: 'COMMUNITY_REVIEW' } }),
    ...overrides,
  };
}

function renderContribution(api: LibraryContributionApiPort, authStatus: 'authenticated' | 'loading' | 'unauthenticated' = 'authenticated') {
  return render(
    <MemoryRouter initialEntries={['/library/contribute']}>
      <Routes>
        <Route path='/library/contribute' element={<LibraryContributionPageView api={api} catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }} authStatus={authStatus} />} />
        <Route path='/login' element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  const from = typeof location.state === 'object' && location.state && 'from' in location.state ? String((location.state as { from?: unknown }).from) : '';
  return <output aria-label='location'>{location.pathname}|{from}</output>;
}

async function fillVocabularyToSubmit() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('radio', { name: /Từ vựng/ }));
  await user.selectOptions(screen.getByLabelText(/Ngôn ngữ chính/), 'vi');
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  await user.type(screen.getByLabelText(/Từ hoặc cụm từ/), 'xin chào');
  await user.type(screen.getByLabelText(/Định nghĩa/), 'lời chào');
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  await user.type(screen.getByLabelText(/Bạn muốn được ghi công/), 'Người đóng góp');
  await user.click(screen.getByRole('radio', { name: /CC BY 4.0/ }));
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  return user;
}

async function fillVocabularyToLicenseStep() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('radio', { name: /Từ vựng/ }));
  await user.selectOptions(screen.getByLabelText(/Ngôn ngữ chính/), 'vi');
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  await user.type(screen.getByLabelText(/Từ hoặc cụm từ/), 'xin chào');
  await user.type(screen.getByLabelText(/Định nghĩa/), 'lời chào');
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  return user;
}

describe('LibraryContributionPage', () => {
  it('redirects unauthenticated visitors with the safe contribution return path', async () => {
    renderContribution(makeApi(), 'unauthenticated');
    expect(await screen.findByLabelText('location')).toHaveTextContent('/login|/library/contribute');
  });

  it('renders only policy-approved types, keeps consents unchecked, and submits the exact staged contract', async () => {
    const attachProvenance = vi.fn().mockResolvedValue({ id: 'provenance-1' });
    const api = makeApi({ attachProvenance });
    renderContribution(api);
    expect(await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Từ vựng/ })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Câu ví dụ/ })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Bản dịch/ })).toBeVisible();
    expect(screen.queryByRole('radio', { name: /GRAMMAR_ITEM/ })).not.toBeInTheDocument();

    const user = await fillVocabularyToSubmit();
    expect(screen.getByRole('checkbox', { name: /đã tạo nội dung/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /tái phân phối công khai/ })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /đã tạo nội dung/ }));
    await user.click(screen.getByRole('checkbox', { name: /tái phân phối công khai/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi đóng góp' }));

    await waitFor(() => expect(api.submitContribution).toHaveBeenCalledTimes(1));
    expect(api.createResource).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'PUBLIC', resourceType: 'VOCABULARY' }));
    expect(api.attachProvenance).toHaveBeenCalledWith('resource-1', expect.objectContaining({
      sourceType: 'ORIGINAL_AUTHOR',
      sourceId: 'community-contribution:resource-1',
      licenseKey: 'CC-BY-4.0',
      attribution: 'Người đóng góp',
    }));
    expect(attachProvenance.mock.calls[0][1]).not.toHaveProperty('originalContributorUserId');
    expect(api.submitContribution).toHaveBeenCalledWith('resource-1', {
      termsVersion: 'server-v2',
      rightsConfirmed: true,
      reuseConsent: true,
    });
    expect(await screen.findByRole('heading', { name: 'Cảm ơn bạn đã đóng góp.' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Cảm ơn bạn đã đóng góp.' })).toHaveFocus();
    expect(screen.queryByRole('link', { name: /resource-1/ })).not.toBeInTheDocument();
  });

  it('keeps malformed topics on step 0 and focuses the visible topics control', async () => {
    renderContribution(makeApi());
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /Từ vựng/ }));
    await user.selectOptions(screen.getByLabelText(/Ngôn ngữ chính/), 'vi');
    const topics = screen.getByLabelText(/Chủ đề/);
    await user.type(topics, 'giao.tiep');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(screen.queryByRole('heading', { name: 'Nội dung để người học sử dụng' })).not.toBeInTheDocument();
    expect(screen.getByText(/Mỗi chủ đề cần là chữ, số hoặc dấu gạch nối/)).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(topics));
  });

  it('keeps more than 20 topics on step 0 and focuses the topics control', async () => {
    renderContribution(makeApi());
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /Từ vựng/ }));
    await user.selectOptions(screen.getByLabelText(/Ngôn ngữ chính/), 'vi');
    const topics = screen.getByLabelText(/Chủ đề/);
    fireEvent.change(topics, { target: { value: Array.from({ length: 21 }, (_, index) => `topic-${index + 1}`).join(', ') } });
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(screen.queryByRole('heading', { name: 'Nội dung để người học sử dụng' })).not.toBeInTheDocument();
    expect(screen.getByText(/tối đa 20 chủ đề/)).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(topics));
  });

  it('focuses the first license radio when the license is missing', async () => {
    renderContribution(makeApi());
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = await fillVocabularyToLicenseStep();
    await user.type(screen.getByLabelText(/Bạn muốn được ghi công/), 'Người đóng góp');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    const firstLicense = screen.getByRole('radio', { name: /CC BY 4.0/ });
    expect(screen.getByText('Chọn một giấy phép phù hợp.')).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(firstLicense));
  });

  it('retries provenance against the same resource and never creates a second draft', async () => {
    const attachProvenance = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    const api = makeApi({ attachProvenance });
    renderContribution(api);
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = await fillVocabularyToSubmit();
    await user.click(screen.getByRole('checkbox', { name: /đã tạo nội dung/ }));
    await user.click(screen.getByRole('checkbox', { name: /tái phân phối công khai/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi đóng góp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể hoàn tất bước này');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(api.submitContribution).toHaveBeenCalledTimes(1));
    expect(api.createResource).toHaveBeenCalledTimes(1);
    expect(api.attachProvenance).toHaveBeenCalledTimes(2);
    expect(attachProvenance.mock.calls[1][0]).toBe('resource-1');
  });

  it('retries submit against the same resource without repeating provenance', async () => {
    const submitContribution = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ resource: { id: 'resource-1', reviewState: 'COMMUNITY_REVIEW' } });
    const api = makeApi({ submitContribution });
    renderContribution(api);
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = await fillVocabularyToSubmit();
    await user.click(screen.getByRole('checkbox', { name: /đã tạo nội dung/ }));
    await user.click(screen.getByRole('checkbox', { name: /tái phân phối công khai/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi đóng góp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể hoàn tất bước này');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cảm ơn bạn đã đóng góp.' })).toBeVisible());
    expect(api.createResource).toHaveBeenCalledTimes(1);
    expect(api.attachProvenance).toHaveBeenCalledTimes(1);
    expect(submitContribution).toHaveBeenNthCalledWith(2, 'resource-1', expect.objectContaining({ termsVersion: 'server-v2' }));
  });

  it('refreshes policy and clears consent without auto-resubmitting on stale terms', async () => {
    const submitContribution = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('stale', 409, 'LIBRARY_CONTRIBUTION_TERMS_STALE'))
      .mockResolvedValueOnce({ resource: { id: 'resource-1', reviewState: 'COMMUNITY_REVIEW' } });
    const getPolicy = vi.fn()
      .mockResolvedValueOnce(policy)
      .mockResolvedValueOnce({ ...policy, termsVersion: 'server-v3' });
    const api = makeApi({ getPolicy, submitContribution });
    renderContribution(api);
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = await fillVocabularyToSubmit();
    await user.click(screen.getByRole('checkbox', { name: /đã tạo nội dung/ }));
    await user.click(screen.getByRole('checkbox', { name: /tái phân phối công khai/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi đóng góp' }));
    expect(await screen.findByText('Chính sách đóng góp đã thay đổi. Hãy xem lại điều khoản và xác nhận mới trước khi gửi lại.')).toBeVisible();
    await waitFor(() => expect(api.getPolicy).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('checkbox', { name: /đã tạo nội dung/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /tái phân phối công khai/ })).not.toBeChecked();
    expect(api.submitContribution).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('checkbox', { name: /đã tạo nội dung/ }));
    await user.click(screen.getByRole('checkbox', { name: /tái phân phối công khai/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi đóng góp' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cảm ơn bạn đã đóng góp.' })).toBeVisible());
    expect(api.createResource).toHaveBeenCalledTimes(1);
    expect(api.attachProvenance).toHaveBeenCalledTimes(1);
    expect(submitContribution).toHaveBeenNthCalledWith(2, 'resource-1', {
      termsVersion: 'server-v3',
      rightsConfirmed: true,
      reuseConsent: true,
    });
  });

  it.each([
    ['LIBRARY_LICENSE_DISABLED', 'Giấy phép đã chọn không còn phù hợp.'],
    ['LIBRARY_LICENSE_REDISTRIBUTION_REQUIRED', 'Giấy phép đã chọn không còn phù hợp.'],
  ])('keeps a permanent license-policy failure fail-closed without a retry draft (%s)', async (code, notice) => {
    const submitContribution = vi.fn().mockRejectedValue(new ApiClientError('license changed', 409, code));
    const getPolicy = vi.fn().mockResolvedValue(policy);
    const api = makeApi({ getPolicy, submitContribution });
    renderContribution(api);
    await screen.findByRole('heading', { name: 'Chuẩn bị đóng góp' });
    const user = await fillVocabularyToSubmit();
    await user.click(screen.getByRole('checkbox', { name: /đã tạo nội dung/ }));
    await user.click(screen.getByRole('checkbox', { name: /tái phân phối công khai/ }));
    await user.click(screen.getByRole('button', { name: 'Gửi đóng góp' }));

    expect(await screen.findByText(new RegExp(notice.replace('.', '\\.'), 'u'))).toBeVisible();
    expect(await screen.findByText(/Bản nháp đã tạo được giữ nguyên/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu đóng góp mới' })).toBeVisible();
    await waitFor(() => expect(getPolicy).toHaveBeenCalledTimes(2));
    expect(api.createResource).toHaveBeenCalledTimes(1);
    expect(api.attachProvenance).toHaveBeenCalledTimes(1);
    expect(submitContribution).toHaveBeenCalledTimes(1);
  });

  it('fails closed when policy has no eligible licenses', async () => {
    const noLicensePolicy = { ...policy, licenses: [] };
    const api = makeApi({ getPolicy: vi.fn().mockResolvedValue(noLicensePolicy) });
    renderContribution(api);
    expect(await screen.findByRole('heading', { name: /chưa có giấy phép phù hợp/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Gửi đóng góp' })).not.toBeInTheDocument();
  });
});
