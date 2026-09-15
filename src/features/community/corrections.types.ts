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
  getCorrectionRequest(postId: string): Promise<CorrectionRequestResponse>;
  createQuestion(input: QuestionInput): Promise<CommunityPost>;
  getQuestion(postId: string): Promise<CommunityPost>;
}

export interface CommunityLanguageCatalogApi {
  listLanguages(search?: string): Promise<import('../languages/languages.types').LanguageCatalogItem[]>;
}
