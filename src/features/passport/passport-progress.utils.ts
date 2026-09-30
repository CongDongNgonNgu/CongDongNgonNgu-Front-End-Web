import type {
  ContributorBadge,
  LearningActivitySummary,
  LearningMilestone,
} from './passport-progress.types';

const ACTIVITY_LABELS: Record<LearningActivitySummary['sourceType'], string> = {
  PRACTICE_COMPLETED: 'Hoàn thành bài luyện tập',
  LEARNING_SESSION_COMPLETED: 'Hoàn thành phiên học',
  VOCABULARY_MILESTONE: 'Đạt mốc từ vựng',
  QUIZ_MILESTONE: 'Đạt mốc bài kiểm tra',
};

const BADGE_LABELS: Record<string, { title: string; description: string }> = {
  FIRST_TRUSTED_CONTRIBUTION: {
    title: 'Đóng góp đáng tin đầu tiên',
    description: 'Có một đóng góp cộng đồng được xác minh độc lập và còn hiệu lực.',
  },
  CORRECTION_HELPER: {
    title: 'Người hỗ trợ sửa câu',
    description: 'Có một bản sửa ngôn ngữ công khai được người hỏi chấp nhận.',
  },
  TRANSLATION_KEEPER: {
    title: 'Người giữ bản dịch',
    description: 'Có một bản dịch công khai được người kiểm duyệt có thẩm quyền xác minh.',
  },
  RESOURCE_STEWARD: {
    title: 'Người chăm tài nguyên',
    description: 'Có một tài nguyên ngôn ngữ công khai được người kiểm duyệt xác minh.',
  },
  REVIEW_GUARDIAN: {
    title: 'Người bảo chứng đánh giá',
    description: 'Hoàn thành một lượt xác minh đóng góp đáng tin cậy với vai trò được ủy quyền.',
  },
};

export function activityLabel(sourceType: LearningActivitySummary['sourceType']): string {
  return ACTIVITY_LABELS[sourceType] ?? 'Hoạt động học đã hoàn tất';
}

export function milestoneLabel(milestone: LearningMilestone): string {
  return milestone.kind === 'STREAK'
    ? `Chuỗi học đạt ${milestone.threshold} ngày`
    : `Learning XP đạt ${milestone.threshold} điểm`;
}

export function badgeTitle(badge: ContributorBadge): string {
  return BADGE_LABELS[badge.id]?.title ?? badge.title;
}

export function badgeDescription(badge: ContributorBadge): string {
  return BADGE_LABELS[badge.id]?.description ?? badge.description;
}

export function badgeStatusLabel(status: ContributorBadge['status']): string {
  if (status === 'EARNED') return 'Đã đạt';
  if (status === 'REVOKED') return 'Đã điều chỉnh';
  return 'Đang khóa';
}

export function formatServerDate(value: string): string {
  return value.slice(0, 10);
}
