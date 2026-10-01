import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ChallengeApi } from '../challenge.api';
import type { ChallengePublicProgress, ChallengePublicSummary } from '../challenge.types';
import { ChallengeDiscoveryPageView } from './ChallengeDiscoveryPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const challenge = createChallenge();

describe('ChallengeDiscoveryPage', () => {
  it('renders backend challenges, finite-goal copy and guest join path', async () => {
    const api = createApi();
    renderPage(api, 'unauthenticated');

    expect(await screen.findByRole('heading', { name: 'Bảy ngày nói tiếng Việt' })).toBeVisible();
    expect(screen.getByText('Mục tiêu 7 hoạt động')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đăng nhập để tham gia' })).toHaveAttribute('href', '/login');
    expect(screen.getByText('Mỗi thử thách có mục tiêu và thời hạn rõ ràng. Không có chuỗi ngày, bảng xếp hạng hay phạt khi bạn cần nghỉ.')).toBeVisible();
    expect(screen.queryByText(/Bạn phải duy trì chuỗi|Sắp hết giờ|Bạn sẽ bị tụt hạng/)).not.toBeInTheDocument();
    expect(api.getProgress).not.toHaveBeenCalled();
  });

  it('joins and refreshes server-projected progress for an authenticated learner', async () => {
    const user = userEvent.setup();
    let joined = false;
    const progress: ChallengePublicProgress = {
      status: 'JOINED',
      progressValue: 1,
      goal: { unit: 'ACTIVITIES', target: 7 },
      completionPercent: 14,
      completedAt: null,
    };
    const api = createApi({
      getProgress: vi.fn(async () => joined ? progress : null),
      join: vi.fn(async () => {
        joined = true;
        return { replayed: false, participation: { status: 'JOINED', joinedAt: challenge.startAt, leftAt: null, completedAt: null, progressValue: 0 } };
      }),
    });
    renderPage(api, 'authenticated');

    await user.click(await screen.findByRole('button', { name: 'Tham gia thử thách' }));

    await waitFor(() => expect(api.join).toHaveBeenCalledWith(challenge.id));
    expect(await screen.findByText('1 / 7')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Rời thử thách' })).toBeVisible();
  });

  it('keeps expired challenges understandable and does not render a write action', async () => {
    const expired = createChallenge({ state: 'EXPIRED', endAt: '2026-09-10T00:00:00.000Z' });
    const api = createApi({
      list: vi.fn(async () => [expired]),
      get: vi.fn(async () => expired),
    });
    renderPage(api, 'authenticated');

    expect(await screen.findByRole('heading', { name: 'Bảy ngày nói tiếng Việt' })).toBeVisible();
    expect(screen.getByText('Thử thách đã kết thúc; tiến độ cũ vẫn được giữ để bạn tham khảo.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tham gia thử thách' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rời thử thách' })).not.toBeInTheDocument();
  });

  it('shows a truthful error state with retry', async () => {
    const api = createApi({ list: vi.fn().mockRejectedValue(new Error('offline')) });
    renderPage(api, 'unauthenticated');

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được thử thách');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    expect(screen.queryByText('Bảy ngày nói tiếng Việt')).not.toBeInTheDocument();
  });
});

function renderPage(api: ChallengeApi, authStatus: 'authenticated' | 'unauthenticated') {
  return render(
    <MemoryRouter>
      <ChallengeDiscoveryPageView api={api} authStatus={authStatus} />
    </MemoryRouter>,
  );
}

function createApi(overrides: Partial<Record<keyof ChallengeApi, unknown>> = {}): ChallengeApi {
  const api = {
    list: vi.fn(async () => [challenge]),
    get: vi.fn(async () => challenge),
    getProgress: vi.fn(async () => null),
    join: vi.fn(async () => ({ replayed: false, participation: { status: 'JOINED', joinedAt: challenge.startAt, leftAt: null, completedAt: null, progressValue: 0 } })),
    leave: vi.fn(async () => ({ status: 'LEFT', joinedAt: challenge.startAt, leftAt: challenge.endAt, completedAt: null, progressValue: 0 })),
    ...overrides,
  };
  return api as ChallengeApi;
}

function createChallenge(overrides: Partial<ChallengePublicSummary> = {}): ChallengePublicSummary {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Bảy ngày nói tiếng Việt',
    description: 'Hoàn thành hoạt động nói có bằng chứng.',
    challengeType: 'SPEAKING',
    languageCode: 'vi',
    level: 'A2',
    topic: 'Daily speaking',
    startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-10-08T00:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    goal: { unit: 'ACTIVITIES', target: 7 },
    state: 'ACTIVE',
    participantCount: 1,
    ...overrides,
  };
}
