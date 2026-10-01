import type { ChallengeGoal, ChallengePublicState } from './challenge.types';

export function challengeStateLabel(state: ChallengePublicState): string {
  switch (state) {
    case 'UPCOMING': return 'Sắp bắt đầu';
    case 'ACTIVE': return 'Đang mở';
    case 'EXPIRED': return 'Đã kết thúc';
    case 'CANCELLED': return 'Đã hủy';
  }
}

export function challengeStateTone(state: ChallengePublicState): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (state) {
    case 'UPCOMING': return 'info';
    case 'ACTIVE': return 'success';
    case 'EXPIRED': return 'neutral';
    case 'CANCELLED': return 'danger';
  }
}

export function challengeTypeLabel(type: string): string {
  switch (type) {
    case 'SPEAKING': return 'Nói';
    case 'SENTENCE_PRACTICE': return 'Đặt câu';
    case 'PRONUNCIATION': return 'Phát âm';
    case 'VOCABULARY': return 'Từ vựng';
    case 'COMMUNITY': return 'Cộng đồng';
    default: return type;
  }
}

export function goalLabel(goal: ChallengeGoal): string {
  const unit = goal.unit === 'ACTIVITIES' ? 'hoạt động' : goal.unit === 'MINUTES' ? 'phút' : 'mục';
  return `${goal.target} ${unit}`;
}

export function formatDateRange(startAt: string, endAt: string, timezone: string): string {
  return `${formatDate(startAt, timezone)} — ${formatDate(endAt, timezone)}`;
}

export function formatDate(value: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}

export function participantLabel(count: number): string {
  return `${count} người đã tham gia`;
}
