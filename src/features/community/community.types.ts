export const COMMUNITY_POST_TYPES = [
  'DISCUSSION',
  'QUESTION',
  'RESOURCE',
  'LEARNING_JOURNAL',
  'CULTURE',
  'PRONUNCIATION_REQUEST',
  'CORRECTION_REQUEST',
  'CHALLENGE',
] as const;

export type CommunityPostType = (typeof COMMUNITY_POST_TYPES)[number];

export const COMMUNITY_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CommunityCefrLevel = (typeof COMMUNITY_CEFR_LEVELS)[number];

export const COMMUNITY_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const COMMUNITY_REPORT_CATEGORIES = [
  'SPAM',
  'HARASSMENT',
  'HATE',
  'MISINFORMATION',
  'SEXUAL_CONTENT',
  'OTHER',
] as const;

export type CommunityReportCategory = (typeof COMMUNITY_REPORT_CATEGORIES)[number];

export interface CommunityAuthor {
  id: string;
  displayName: string;
}

export interface CommunityLanguage {
  code: string;
  slug: string;
  nativeName: string;
  englishName: string;
  vietnameseName: string;
  direction: 'ltr' | 'rtl';
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  targetLanguage: CommunityLanguage;
  postType: CommunityPostType;
  content: string;
  cefrLevel: CommunityCefrLevel | null;
  topic: string | null;
  visibility: CommunityVisibility;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  canonicalPath: string | null;
  isShareable: boolean;
  isOwner: boolean;
  helpfulCount: number;
  viewerReacted: boolean;
  commentCount: number;
  isSaved: boolean;
}

export interface CommunityPostListResponse {
  items: CommunityPost[];
  nextCursor: string | null;
}

export interface CommunityCreatePostInput {
  postType: CommunityPostType;
  languageCode: string;
  content: string;
  cefrLevel?: CommunityCefrLevel;
  topic?: string;
  visibility?: CommunityVisibility;
}

export interface CommunityPostUpdateInput {
  postType?: CommunityPostType;
  languageCode?: string;
  content?: string;
  cefrLevel?: CommunityCefrLevel | null;
  topic?: string | null;
  visibility?: CommunityVisibility;
}

export interface CommunityComposerInput {
  postType: string;
  languageCode: string;
  content: string;
  cefrLevel: string;
  topic: string;
  visibility: CommunityVisibility;
}

export interface CommunityComment {
  id: string;
  author: CommunityAuthor | null;
  parentCommentId: string | null;
  depth: 0 | 1;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isDeleted: boolean;
}

export interface CommunityCommentThread extends CommunityComment {
  replies: CommunityComment[];
  hasMoreReplies: boolean;
}

export interface CommunityCommentListResponse {
  items: CommunityCommentThread[];
  nextCursor: string | null;
}

export interface CommunityCommentQuery {
  limit?: number;
  cursor?: string;
}

export interface CommunityCreateCommentInput {
  content: string;
  parentCommentId?: string;
}

export interface CommunityUpdateCommentInput {
  content: string;
}

export interface CommunityDeleteResponse {
  deleted: true;
}

export interface CommunityReactionResponse {
  postId: string;
  type: 'HELPFUL';
  reacted: boolean;
  helpfulCount: number;
}

export interface CommunitySaveResponse {
  postId: string;
  saved: boolean;
}

export interface CommunityShareResponse {
  postId: string;
  canonicalPath: string;
  isShareable: true;
}

export interface CommunityReportResponse {
  submitted: true;
}

export interface CommunityRequestClient {
  requestPublic<T>(path: string, init?: RequestInit): Promise<T>;
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface CommunityPostQuery {
  languageCode?: string;
  limit?: number;
  cursor?: string;
}

export interface CommunityReportInput {
  category: CommunityReportCategory;
  details?: string;
}
