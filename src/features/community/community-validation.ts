import { translate, type UiLocale } from '../ui-locale/ui-locale';
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

export function validateComposerInput(input: CommunityComposerInput, locale: UiLocale = 'vi'): ComposerValidationErrors {
  const errors: ComposerValidationErrors = {};

  if (!COMMUNITY_POST_TYPES.includes(input.postType as CommunityPostType)) {
    errors.postType = translate(locale, "community.posts.please.choose.a.post.type");
  }

  if (!input.languageCode) {
    errors.languageCode = translate(locale, "community.posts.please.choose.a.target.language");
  }

  const contentLength = countUnicodeCodePoints(input.content);
  if (!input.content.trim()) {
    errors.content = translate(locale, "community.posts.content.cannot.contain.only.whitespace");
  } else if (contentLength > MAX_COMMUNITY_CONTENT_CODE_POINTS) {
    errors.content = translate(locale, "community.posts.content.must.not.exceed.twentyThousand.characters");
  }

  if (input.topic && countUnicodeCodePoints(input.topic) > MAX_COMMUNITY_TOPIC_CODE_POINTS) {
    errors.topic = translate(locale, "community.posts.topic.must.not.exceed.eighty.characters");
  }

  if (input.cefrLevel && !COMMUNITY_CEFR_LEVELS.includes(input.cefrLevel as (typeof COMMUNITY_CEFR_LEVELS)[number])) {
    errors.cefrLevel = translate(locale, "community.posts.please.choose.a.valid.cefr.level");
  }

  if (!COMMUNITY_VISIBILITIES.includes(input.visibility)) {
    errors.visibility = translate(locale, "community.posts.please.choose.a.valid.visibility.setting");
  }

  return errors;
}

export function validateCommentInput(input: { content: string }, locale: UiLocale = 'vi'): CommentValidationErrors {
  const errors: CommentValidationErrors = {};
  const contentLength = countUnicodeCodePoints(input.content);
  if (!input.content.trim()) {
    errors.content = translate(locale, "community.posts.a.comment.cannot.contain.only.whitespace");
  } else if (contentLength > MAX_COMMUNITY_COMMENT_CONTENT_CODE_POINTS) {
    errors.content = translate(locale, "community.posts.a.comment.must.not.exceed.fiveThousand.characters");
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

export function validateReportInput(input: { category: string; details: string }, locale: UiLocale = 'vi'): ReportValidationErrors {
  const errors: ReportValidationErrors = {};
  if (!COMMUNITY_REPORT_CATEGORIES.includes(input.category as (typeof COMMUNITY_REPORT_CATEGORIES)[number])) {
    errors.category = translate(locale, "community.posts.please.choose.a.report.reason");
  }
  if (countUnicodeCodePoints(input.details) > MAX_COMMUNITY_REPORT_DETAILS_CODE_POINTS) {
    errors.details = translate(locale, "community.posts.details.must.not.exceed.oneThousand.characters");
  }
  return errors;
}
