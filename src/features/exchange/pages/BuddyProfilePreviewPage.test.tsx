import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BuddyProfilePreviewPageView } from './BuddyProfilePreviewPage';
import type {
  BuddyProfilePreview,
  BuddyProfilePreviewApi,
  ExchangeRelationshipResponse,
  RelationshipState,
} from '../exchange.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function relationship(state: RelationshipState): ExchangeRelationshipResponse {
  return {
    scope: 'exchange-relationship',
    targetUserId: 'target-1',
    state,
    canRequest: state === 'NONE',
    canAccept: state === 'INCOMING_PENDING',
    canDecline: state === 'INCOMING_PENDING',
    canCancel: state === 'OUTGOING_PENDING',
    canDisconnect: state === 'CONNECTED',
  };
}

function profile(state: RelationshipState = 'NONE'): BuddyProfilePreview {
  return {
    scope: 'exchange-buddy',
    user: { id: 'target-1', displayName: 'Kenji S.' },
    languages: [
      {
        code: 'en',
        slug: 'english',
        nativeName: 'English',
        englishName: 'English',
        vietnameseName: 'Tiếng Anh',
        direction: 'ltr',
        offered: true,
        wanted: false,
        declaredProficiency: 'C1',
        assessedProficiency: null,
      },
      {
        code: 'vi',
        slug: 'vietnamese',
        nativeName: 'Tiếng Việt',
        englishName: 'Vietnamese',
        vietnameseName: 'Tiếng Việt',
        direction: 'ltr',
        offered: false,
        wanted: true,
        declaredProficiency: 'A1',
        assessedProficiency: null,
      },
    ],
    goals: ['conversation'],
    interests: ['music'],
    timezoneSummary: { visibility: 'SUMMARY', hasTimezone: true },
    availabilitySummary: { visibility: 'SUMMARY', hasAvailability: true },
    relationship: relationship(state),
  };
}

function makeApi(state: RelationshipState = 'NONE'): BuddyProfilePreviewApi {
  return {
    getBuddyProfile: vi.fn().mockResolvedValue(profile(state)),
    getBlockStatus: vi.fn().mockResolvedValue({
      scope: 'exchange-block-status',
      targetUserId: 'target-1',
      blockedByMe: false,
    }),
    blockUser: vi.fn().mockResolvedValue({
      scope: 'exchange-block',
      targetUserId: 'target-1',
      blocked: true,
    }),
    unblockUser: vi.fn().mockResolvedValue({
      scope: 'exchange-block',
      targetUserId: 'target-1',
      blocked: false,
    }),
    reportUser: vi.fn().mockResolvedValue({ scope: 'exchange-report', submitted: true }),
    getContactPermission: vi.fn().mockResolvedValue({
      scope: 'exchange-contact-permission',
      targetUserId: 'target-1',
      decision: 'DENIED_NOT_CONNECTED',
    }),
    getRelationship: vi.fn().mockResolvedValue(relationship(state)),
    requestConnection: vi.fn().mockResolvedValue(relationship('OUTGOING_PENDING')),
    acceptConnection: vi.fn().mockResolvedValue(relationship('CONNECTED')),
    declineConnection: vi.fn().mockResolvedValue(relationship('NONE')),
    cancelConnection: vi.fn().mockResolvedValue(relationship('NONE')),
    disconnect: vi.fn().mockResolvedValue(relationship('NONE')),
  };
}

function renderPage(api: BuddyProfilePreviewApi, state = 'target-1') {
  return render(
    <MemoryRouter initialEntries={[`/exchange/profile/${state}`]}>
      <BuddyProfilePreviewPageView api={api} authenticated userId={state} />
    </MemoryRouter>,
  );
}

describe('BuddyProfilePreviewPageView', () => {
  it('renders the safe projection and prevents duplicate request clicks while loading', async () => {
    const user = userEvent.setup();
    const api = makeApi();
    const request = deferred<ExchangeRelationshipResponse>();
    api.requestConnection = vi.fn().mockReturnValue(request.promise);
    renderPage(api);

    expect(screen.getByRole('status', { name: 'Đang tải hồ sơ bạn cùng học' })).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Kenji S.' })).toBeVisible();
    expect(screen.getAllByText('English')[0]).toBeVisible();
    expect(screen.getByText('Tiếng Việt')).toBeVisible();
    expect(screen.getByText('Giao tiếp tự tin')).toBeVisible();
    expect(screen.getByText('Music')).toBeVisible();
    expect(screen.queryByText(/@example|Asia\/|08:00/i)).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Kết nối' });
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(api.requestConnection).toHaveBeenCalledTimes(1);

    request.resolve(relationship('OUTGOING_PENDING'));
    expect(await screen.findByText('Đã gửi yêu cầu kết nối.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hủy yêu cầu' })).toBeVisible();
  });

  it.each([
    ['NONE', 'Kết nối', 'requestConnection', 'OUTGOING_PENDING'],
    ['OUTGOING_PENDING', 'Hủy yêu cầu', 'cancelConnection', 'NONE'],
    ['INCOMING_PENDING', 'Chấp nhận kết nối', 'acceptConnection', 'CONNECTED'],
    ['INCOMING_PENDING', 'Từ chối', 'declineConnection', 'NONE'],
    ['CONNECTED', 'Ngắt kết nối', 'disconnect', 'NONE'],
  ] as const)('renders %s and completes the %s action', async (state, label, method, nextState) => {
    const user = userEvent.setup();
    const api = makeApi(state);
    renderPage(api);

    await screen.findByRole('heading', { name: 'Kenji S.' });
    const button = screen.getByRole('button', { name: label });
    await user.click(button);
    await waitFor(() => expect(api[method]).toHaveBeenCalledWith('target-1'));
    expect(await screen.findByText(successMessageFor(method))).toBeVisible();
    expect(screen.getAllByText(stateText(nextState))[0]).toBeVisible();
  });

  it('shows decline separately for incoming requests and reports mutation errors', async () => {
    const user = userEvent.setup();
    const api = makeApi('INCOMING_PENDING');
    api.declineConnection = vi.fn().mockRejectedValue(new Error('Kết nối tạm thời không khả dụng'));
    renderPage(api);

    await screen.findByRole('heading', { name: 'Kenji S.' });
    await user.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kết nối tạm thời không khả dụng');
    expect(screen.getByRole('button', { name: 'Chấp nhận kết nối' })).toBeVisible();
  });

  it('requires confirmation before blocking and offers actor-owned unblock without restoring the relationship', async () => {
    const user = userEvent.setup();
    const api = makeApi();
    renderPage(api);

    await screen.findByRole('heading', { name: 'Kenji S.' });
    await user.click(screen.getByRole('button', { name: 'An toàn' }));
    await user.click(screen.getByRole('menuitem', { name: 'Chặn thành viên' }));
    expect(screen.getByRole('dialog', { name: 'Chặn thành viên này?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chặn thành viên' }));

    expect(api.blockUser).toHaveBeenCalledWith('target-1');
    expect(await screen.findByRole('heading', { name: 'Hồ sơ không khả dụng' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bỏ chặn thành viên' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Bỏ chặn thành viên' }));
    expect(screen.getByRole('dialog', { name: 'Bỏ chặn thành viên?' })).toBeVisible();
    await user.click(within(screen.getByRole('dialog', { name: 'Bỏ chặn thành viên?' })).getByRole('button', { name: 'Bỏ chặn thành viên' }));
    expect(api.unblockUser).toHaveBeenCalledWith('target-1');
    expect(await screen.findByRole('heading', { name: 'Kenji S.' })).toBeVisible();
  });

  it('keeps reporting private and validates the bounded category/context form', async () => {
    const user = userEvent.setup();
    const api = makeApi();
    renderPage(api);

    await screen.findByRole('heading', { name: 'Kenji S.' });
    await user.click(screen.getByRole('button', { name: 'An toàn' }));
    await user.click(screen.getByRole('menuitem', { name: 'Báo cáo hồ sơ' }));
    expect(screen.getByRole('dialog', { name: 'Báo cáo hồ sơ' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Hãy chọn một lý do');
    await user.selectOptions(screen.getByRole('combobox'), 'SAFETY_CONCERN');
    await user.type(screen.getByRole('textbox'), 'Cần xem xét riêng tư.');
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(api.reportUser).toHaveBeenCalledWith('target-1', {
      category: 'SAFETY_CONCERN',
      context: 'Cần xem xét riêng tư.',
    });
    expect(await screen.findByText('Đã tiếp nhận báo cáo')).toBeVisible();
  });
});

function stateText(state: string): string {
  switch (state) {
    case 'OUTGOING_PENDING': return 'Đã gửi yêu cầu';
    case 'INCOMING_PENDING': return 'Có yêu cầu đang chờ';
    case 'CONNECTED': return 'Đã kết nối';
    default: return 'Chưa kết nối';
  }
}

function successMessageFor(method: 'requestConnection' | 'acceptConnection' | 'declineConnection' | 'cancelConnection' | 'disconnect'): string {
  switch (method) {
    case 'requestConnection': return 'Đã gửi yêu cầu kết nối.';
    case 'acceptConnection': return 'Đã chấp nhận yêu cầu kết nối.';
    case 'declineConnection': return 'Đã từ chối yêu cầu kết nối.';
    case 'cancelConnection': return 'Đã hủy yêu cầu kết nối.';
    case 'disconnect': return 'Đã ngắt kết nối.';
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}
