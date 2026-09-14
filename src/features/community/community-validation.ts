import {
  COMMUNITY_CEFR_LEVELS,
  COMMUNITY_POST_TYPES,
  COMMUNITY_REPORT_CATEGORIES,
  COMMUNITY_VISIBILITIES,
  type CommunityComposerInput,
  type CommunityCreatePostInput,
  type CommunityPostType,
} from './community.types';

export const MAX_COMMUNITY_CONTENT_CODE_POINTS = 20_000;
export const MAX_COMMUNITY_COMMENT_CONTENT_CODE_POINTS = 5_000;
export const MAX_COMMUNITY_TOPIC_CODE_POINTS = 80;
export const MAX_COMMUNITY_REPORT_DETAILS_CODE_POINTS = 1_000;

export type ComposerValidationErrors = Partial<
  Record<'postType' | 'languageCode' | 'content' | 'cefrLevel' | 'topic' | 'visibility', string>
>;

export type ReportValidationErrors = Partial<Record<'category' | 'details', string>>;
export type CommentValidationErrors = Partial<Record<'content', string>>;

export function countUnicodeCodePoints(value: string): number {
  return Array.from(value).length;
}

export function validateComposerInput(input: CommunityComposerInput): ComposerValidationErrors {
  const errors: ComposerValidationErrors = {};

  if (!COMMUNITY_POST_TYPES.includes(input.postType as CommunityPostType)) {
    errors.postType = 'Vui lòng chọn loại bài viết.';
  }

  if (!input.languageCode) {
    errors.languageCode = 'Vui lòng chọn ngôn ngữ mục tiêu.';
  }

  const contentLength = countUnicodeCodePoints(input.content);
  if (!input.content.trim()) {
    errors.content = 'Nội dung không thể chỉ chứa khoảng trắng.';
  } else if (contentLength > MAX_COMMUNITY_CONTENT_CODE_POINTS) {
    errors.content = 'Nội dung không được vượt quá 20.000 ký tự.';
  }

  if (input.topic && countUnicodeCodePoints(input.topic) > MAX_COMMUNITY_TOPIC_CODE_POINTS) {
    errors.topic = 'Chủ đề không được vượt quá 80 ký tự.';
  }

  if (input.cefrLevel && !COMMUNITY_CEFR_LEVELS.includes(input.cefrLevel as (typeof COMMUNITY_CEFR_LEVELS)[number])) {
    errors.cefrLevel = 'Vui lòng chọn trình độ CEFR hợp lệ.';
  }

  if (!COMMUNITY_VISIBILITIES.includes(input.visibility)) {
    errors.visibility = 'Vui lòng chọn quyền hiển thị hợp lệ.';
  }

  return errors;
}

export function validateCommentInput(input: { content: string }): CommentValidationErrors {
  const errors: CommentValidationErrors = {};
  const contentLength = countUnicodeCodePoints(input.content);
  if (!input.content.trim()) {
    errors.content = 'Bình luận không thể chỉ chứa khoảng trắng.';
  } else if (contentLength > MAX_COMMUNITY_COMMENT_CONTENT_CODE_POINTS) {
    errors.content = 'Bình luận không được vượt quá 5.000 ký tự.';
  }
  return errors;
}

export function buildCreatePostPayload(input: CommunityComposerInput): CommunityCreatePostInput {
  const payload: CommunityCreatePostInput = {
    postType: input.postType as CommunityPostType,
    languageCode: input.languageCode,
    content: input.content,
    visibility: input.visibility,
  };

  if (input.cefrLevel) {
    payload.cefrLevel = input.cefrLevel as (typeof COMMUNITY_CEFR_LEVELS)[number];
  }

  if (input.topic.trim()) {
    payload.topic = input.topic;
  }

  return payload;
}

export function validateReportInput(input: { category: string; details: string }): ReportValidationErrors {
  const errors: ReportValidationErrors = {};
  if (!COMMUNITY_REPORT_CATEGORIES.includes(input.category as (typeof COMMUNITY_REPORT_CATEGORIES)[number])) {
    errors.category = 'Vui lòng chọn lý do báo cáo.';
  }
  if (countUnicodeCodePoints(input.details) > MAX_COMMUNITY_REPORT_DETAILS_CODE_POINTS) {
    errors.details = 'Chi tiết không được vượt quá 1.000 ký tự.';
  }
  return errors;
}
