import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import { PassportProgressPanel } from './PassportProgressPanel';
import type { PassportProgressApi } from './passport-progress.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const populatedLearning = {
  totalXp: 42,
  currentStreak: 3,
  longestStreak: 8,
  streakTimezone: 'Asia/Ho_Chi_Minh',
  activeDays: ['2026-09-28', '2026-09-29', '2026-09-30'],
  milestones: [{ kind: 'XP' as const, threshold: 100, achievedOn: '2026-09-30' }],
  recentQualifyingActivity: [{
    sourceType: 'QUIZ_MILESTONE' as const,
    xp: 42,
    completedAt: '2026-09-30T08:00:00.000Z',
  }],
};

const populatedCommunity = {
  communityReputation: 12,
  contributorLevel: {
    id: 'HELPER',
    title: 'Helper',
    minReputation: 5,
    nextLevel: { id: 'CONTRIBUTOR', title: 'Contributor', minReputation: 25 },
  },
  badges: [
    {
      id: 'CORRECTION_HELPER',
      title: 'Correction helper',
      description: 'One accepted public language correction.',
      threshold: 1,
      status: 'EARNED' as const,
      awardedAt: '2026-09-29T08:00:00.000Z',
      revokedAt: null,
    },
    {
      id: 'RESOURCE_STEWARD',
      title: 'Resource steward',
      description: 'One public language resource verified by an authorized reviewer.',
      threshold: 1,
      status: 'REVOKED' as const,
      awardedAt: '2026-09-20T08:00:00.000Z',
      revokedAt: '2026-09-28T08:00:00.000Z',
    },
    {
      id: 'REVIEW_GUARDIAN',
      title: 'Review guardian',
      description: 'One trusted review verification completed by an authorized reviewer.',
      threshold: 1,
      status: 'LOCKED' as const,
      awardedAt: null,
      revokedAt: null,
    },
  ],
  activeContributionCount: 1,
};

function renderPanel(overrides: Partial<PassportProgressApi> = {}) {
  const api: PassportProgressApi = {
    getLearningProgress: vi.fn().mockResolvedValue(populatedLearning),
    getContributorProgress: vi.fn().mockResolvedValue(populatedCommunity),
    ...overrides,
  };
  render(<MemoryRouter><PassportProgressPanel api={api} /></MemoryRouter>);
  return api;
}

describe('PassportProgressPanel', () => {
  it('keeps language learning, XP and community reputation as separate server projections', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Learning XP' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Community Reputation' })).toBeVisible();
    expect(screen.getByText((_, element) => element?.tagName === 'STRONG' && element.textContent?.replace(/\s+/g, ' ').trim() === '42 điểm')).toBeVisible();
    expect(screen.getByText((_, element) => element?.tagName === 'STRONG' && element.textContent?.replace(/\s+/g, ' ').trim() === '12 điểm')).toBeVisible();
    expect(screen.getByText('Chuỗi hiện tại')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByText('Helper')).toBeVisible();
    expect(screen.getByText(/Ngưỡng cấp tiếp theo.*25 điểm/)).toBeVisible();
    expect(screen.queryByText('Đóng góp đáng tin đầu tiên', { exact: false })).not.toBeInTheDocument();
    expect(screen.getByText('Người hỗ trợ sửa câu')).toBeVisible();
    expect(screen.getAllByText('Đã điều chỉnh')).not.toHaveLength(0);
    await user.click(screen.getByText('Người chăm tài nguyên'));
    expect(screen.getByText(/Lịch sử vẫn được giữ lại/)).toBeVisible();
    expect(screen.getByText(/Asia\/Ho_Chi_Minh/)).toBeVisible();
  });

  it('renders an explicit new learner state without NaN or invented progress', async () => {
    const api = renderPanel({
      getLearningProgress: vi.fn().mockResolvedValue({
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        streakTimezone: 'UTC',
        activeDays: [],
        milestones: [],
        recentQualifyingActivity: [],
      }),
      getContributorProgress: vi.fn().mockResolvedValue({
        communityReputation: 0,
        contributorLevel: {
          id: 'NEWCOMER',
          title: 'Newcomer',
          minReputation: 0,
          nextLevel: null,
        },
        badges: [],
        activeContributionCount: 0,
      }),
    });

    expect(await screen.findByText('Bắt đầu một phiên học hoàn tất để tạo mốc đầu tiên.')).toBeVisible();
    expect(screen.getByText(/Chưa có đóng góp được xác minh\./)).toBeVisible();
    expect(screen.getByText(/Chưa có mốc học tập\./)).toBeVisible();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(api.getLearningProgress).toHaveBeenCalledOnce();
    expect(api.getContributorProgress).toHaveBeenCalledOnce();
  });

  it('shows a max-level projection supplied by the server', async () => {
    renderPanel({
      getContributorProgress: vi.fn().mockResolvedValue({
        ...populatedCommunity,
        contributorLevel: {
          id: 'COMMUNITY_STEWARD',
          title: 'Community steward',
          minReputation: 100,
          nextLevel: null,
        },
      }),
    });

    expect(await screen.findByText('Community steward')).toBeVisible();
    expect(screen.getByText(/cấp đóng góp cao nhất/)).toBeVisible();
  });

  it('supports retry and session-expired guidance without fabricating data', async () => {
    const user = userEvent.setup();
    const getLearningProgress = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('expired', 401, 'AUTH_SESSION_EXPIRED'))
      .mockResolvedValueOnce(populatedLearning);
    const getContributorProgress = vi.fn().mockResolvedValue(populatedCommunity);
    const api = renderPanel({ getLearningProgress, getContributorProgress });

    expect(await screen.findByRole('heading', { name: 'Cần đăng nhập lại' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đăng nhập lại' })).toHaveAttribute('href', '/login');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Learning XP' })).toBeVisible());
    expect(api.getLearningProgress).toHaveBeenCalledTimes(2);
  });

  it('keeps the existing projection visible while a manual refresh is pending', async () => {
    const user = userEvent.setup();
    let resolveLearning!: (value: typeof populatedLearning) => void;
    const refreshLearning = new Promise<typeof populatedLearning>((resolve) => { resolveLearning = resolve; });
    const getLearningProgress = vi.fn()
      .mockResolvedValueOnce(populatedLearning)
      .mockReturnValueOnce(refreshLearning);
    const api = renderPanel({ getLearningProgress });

    expect(await screen.findByRole('heading', { name: 'Learning XP' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Làm mới tiến độ học và đóng góp' }));
    expect(screen.getByRole('heading', { name: 'Learning XP' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Làm mới tiến độ học và đóng góp' })).toBeDisabled();
    resolveLearning(populatedLearning);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Làm mới tiến độ học và đóng góp' })).not.toBeDisabled());
    expect(api.getContributorProgress).toHaveBeenCalledTimes(2);
  });
});
