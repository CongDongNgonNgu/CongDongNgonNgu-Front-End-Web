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
