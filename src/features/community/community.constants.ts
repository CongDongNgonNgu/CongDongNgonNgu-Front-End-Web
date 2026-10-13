import {
  COMMUNITY_POST_TYPES,
  COMMUNITY_REPORT_CATEGORIES,
  type CommunityPostType,
  type CommunityReportCategory,
} from './community.types';

export const COMMUNITY_POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  DISCUSSION: 'Thảo luận',
  QUESTION: 'Câu hỏi',
  RESOURCE: 'Tài nguyên',
  LEARNING_JOURNAL: 'Nhật ký học tập',
  CULTURE: 'Văn hóa',
  PRONUNCIATION_REQUEST: 'Nhờ sửa phát âm',
  CORRECTION_REQUEST: 'Nhờ sửa câu',
  CHALLENGE: 'Thử thách',
};

export const COMMUNITY_REPORT_CATEGORY_LABELS: Record<CommunityReportCategory, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Quấy rối',
  HATE: 'Ngôn từ thù ghét',
  MISINFORMATION: 'Thông tin sai lệch',
  SEXUAL_CONTENT: 'Nội dung tình dục',
  OTHER: 'Khác',
};

export { COMMUNITY_POST_TYPES, COMMUNITY_REPORT_CATEGORIES };

export const COMMUNITY_POST_TYPE_LABELS_KEYS = {
  "DISCUSSION": "community.posts.discussion",
  "QUESTION": "community.posts.question",
  "RESOURCE": "community.posts.resource",
  "LEARNING_JOURNAL": "community.posts.learning.journal",
  "CULTURE": "community.posts.culture",
  "PRONUNCIATION_REQUEST": "community.posts.pronunciation.request",
  "CORRECTION_REQUEST": "community.posts.correction.request",
  "CHALLENGE": "community.posts.challenge"
} as const;

export const COMMUNITY_REPORT_CATEGORY_LABELS_KEYS = {
  "SPAM": "community.posts.spam",
  "HARASSMENT": "community.posts.harassment",
  "HATE": "community.posts.hate.speech",
  "MISINFORMATION": "community.posts.misinformation",
  "SEXUAL_CONTENT": "community.posts.sexual.content",
  "OTHER": "community.posts.other"
} as const;
