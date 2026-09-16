import type {
  CommunityCefrLevel,
  CommunityPost,
  CommunityVisibility,
} from './community.types';

export const CORRECTION_INTENTS = [
  'GRAMMAR',
  'STYLE',
  'NATURALNESS',
  'PRONUNCIATION',
] as const;

export type CorrectionIntent = (typeof CORRECTION_INTENTS)[number];

export const CORRECTION_INTENT_LABELS: Record<CorrectionIntent, string> = {
  GRAMMAR: 'Ngữ pháp',
  STYLE: 'Phong cách diễn đạt',
  NATURALNESS: 'Cách nói tự nhiên',
  PRONUNCIATION: 'Phát âm',
};

export const CORRECTION_INTENT_HELP: Record<CorrectionIntent, string> = {
  GRAMMAR: 'Kiểm tra cấu trúc và lỗi ngữ pháp.',
  STYLE: 'Gợi ý cách diễn đạt phù hợp hơn với mục đích hoặc ngữ cảnh.',
  NATURALNESS: 'Giúp câu nghe tự nhiên hơn với người bản ngữ.',
  PRONUNCIATION: 'Xin hướng dẫn cách phát âm hoặc cách đọc phần văn bản này.',
};

export interface CorrectionRequestInput {
  languageCode: string;
  originalText: string;
  correctionIntent: CorrectionIntent;
  context?: string;
  cefrLevel?: CommunityCefrLevel;
  topic?: string;
  visibility: CommunityVisibility;
}

export interface QuestionInput {
  languageCode: string;
  content: string;
  cefrLevel?: CommunityCefrLevel;
  topic?: string;
  visibility: CommunityVisibility;
}

export interface CorrectionRequestRecordResponse {
  postId: string;
  originalText: string;
  correctionIntent: CorrectionIntent;
  context: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionRequestResponse {
  post: CommunityPost;
  correction: CorrectionRequestRecordResponse;
}

export interface CommunityRequestApi {
  createCorrectionRequest(input: CorrectionRequestInput): Promise<CorrectionRequestResponse>;
  getCorrectionRequest(postId: string, authenticated?: boolean): Promise<CorrectionRequestResponse>;
  createQuestion(input: QuestionInput): Promise<CommunityPost>;
  getQuestion(postId: string, authenticated?: boolean): Promise<CommunityPost>;
}

export interface StructuredResponseAuthorResponse {
  id: string;
  displayName: string;
}

export type StructuredResponseKind = 'CORRECTION_PROPOSAL' | 'QA_ANSWER';

export interface StructuredResponseResponse {
  id: string;
  parentPostId: string;
  author: StructuredResponseAuthorResponse | null;
  responseKind: StructuredResponseKind;
  correctedText: string | null;
  answerText: string | null;
  explanation: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  helpfulCount: number;
  viewerHelpful: boolean;
  isAccepted: boolean;
  acceptedAt: string | null;
  canAccept: boolean;
  canVote: boolean;
}

export interface StructuredResponseListResponse {
  items: StructuredResponseResponse[];
  nextCursor: string | null;
}

export interface StructuredResponseInput {
  responseKind: StructuredResponseKind;
  correctedText?: string;
  answerText?: string;
  explanation?: string;
}

export interface StructuredResponseAcceptanceResponse {
  parentPostId: string;
  responseId: string | null;
  acceptedAt: string | null;
  revoked: boolean;
}

export interface CommunityStructuredResponseApi {
  listStructuredResponses(
    postId: string,
    query?: { limit?: number; cursor?: string },
    authenticated?: boolean,
  ): Promise<StructuredResponseListResponse>;
  createStructuredResponse(
    postId: string,
    input: StructuredResponseInput,
  ): Promise<StructuredResponseResponse>;
  addStructuredResponseHelpful(responseId: string): Promise<StructuredResponseResponse>;
  removeStructuredResponseHelpful(responseId: string): Promise<StructuredResponseResponse>;
  acceptStructuredResponse(postId: string, responseId: string): Promise<StructuredResponseResponse>;
  revokeStructuredResponseAcceptance(postId: string): Promise<StructuredResponseAcceptanceResponse>;
}

export interface CommunityLanguageCatalogApi {
  listLanguages(search?: string): Promise<import('../languages/languages.types').LanguageCatalogItem[]>;
}
