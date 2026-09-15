import {
  COMMUNITY_CEFR_LEVELS,
  COMMUNITY_VISIBILITIES,
  type CommunityCefrLevel,
  type CommunityVisibility,
} from './community.types';
import {
  CORRECTION_INTENTS,
  type CorrectionIntent,
  type CorrectionRequestInput,
  type QuestionInput,
} from './corrections.types';
import { countUnicodeCodePoints } from './community-validation';

export const MAX_CORRECTION_TEXT_CODE_POINTS = 20_000;
export const MAX_CORRECTION_CONTEXT_CODE_POINTS = 5_000;
export const MAX_CORRECTION_TOPIC_CODE_POINTS = 80;

export interface CorrectionRequestFormInput {
  languageCode: string;
  originalText: string;
  correctionIntent: string;
  context: string;
  cefrLevel: string;
  topic: string;
  visibility: string;
}

export interface QuestionFormInput {
  languageCode: string;
  content: string;
  cefrLevel: string;
  topic: string;
  visibility: string;
}

export type CorrectionRequestValidationErrors = Partial<
  Record<keyof CorrectionRequestFormInput, string>
>;

export type QuestionValidationErrors = Partial<Record<keyof QuestionFormInput, string>>;

export function validateCorrectionRequestInput(
  input: CorrectionRequestFormInput,
): CorrectionRequestValidationErrors {
  const errors: CorrectionRequestValidationErrors = {};

  if (!input.languageCode) errors.languageCode = 'Vui lòng chọn ngôn ngữ mục tiêu.';
  if (!CORRECTION_INTENTS.includes(input.correctionIntent as CorrectionIntent)) {
    errors.correctionIntent = 'Vui lòng chọn mục tiêu cần cộng đồng hỗ trợ.';
  }
  const originalTextLength = countUnicodeCodePoints(input.originalText);
  if (!input.originalText.trim()) {
    errors.originalText = 'Nội dung cần có chữ hoặc ký tự khác khoảng trắng.';
  } else if (originalTextLength > MAX_CORRECTION_TEXT_CODE_POINTS) {
    errors.originalText = 'Nội dung không được vượt quá 20.000 ký tự.';
  }
  if (countUnicodeCodePoints(input.context) > MAX_CORRECTION_CONTEXT_CODE_POINTS) {
    errors.context = 'Bối cảnh không được vượt quá 5.000 ký tự.';
  }
  validateMetadata(input, errors);
  return errors;
}

export function validateQuestionInput(input: QuestionFormInput): QuestionValidationErrors {
  const errors: QuestionValidationErrors = {};
  if (!input.languageCode) errors.languageCode = 'Vui lòng chọn ngôn ngữ mục tiêu.';
  const contentLength = countUnicodeCodePoints(input.content);
  if (!input.content.trim()) {
    errors.content = 'Câu hỏi không thể chỉ chứa khoảng trắng.';
  } else if (contentLength > MAX_CORRECTION_TEXT_CODE_POINTS) {
    errors.content = 'Câu hỏi không được vượt quá 20.000 ký tự.';
  }
  validateMetadata(input, errors);
  return errors;
}

export function buildCorrectionRequestPayload(
  input: CorrectionRequestFormInput,
): CorrectionRequestInput {
  const payload: CorrectionRequestInput = {
    languageCode: input.languageCode,
    originalText: input.originalText,
    correctionIntent: input.correctionIntent as CorrectionIntent,
    visibility: input.visibility as CommunityVisibility,
  };
  if (input.context.trim()) payload.context = input.context;
  if (input.cefrLevel) payload.cefrLevel = input.cefrLevel as CommunityCefrLevel;
  if (input.topic.trim()) payload.topic = input.topic;
  return payload;
}

export function buildQuestionPayload(input: QuestionFormInput): QuestionInput {
  const payload: QuestionInput = {
    languageCode: input.languageCode,
    content: input.content,
    visibility: input.visibility as CommunityVisibility,
  };
  if (input.cefrLevel) payload.cefrLevel = input.cefrLevel as CommunityCefrLevel;
  if (input.topic.trim()) payload.topic = input.topic;
  return payload;
}

function validateMetadata(
  input: Pick<CorrectionRequestFormInput, 'cefrLevel' | 'topic' | 'visibility'>,
  errors: Partial<Record<'cefrLevel' | 'topic' | 'visibility', string>>,
): void {
  if (input.topic && countUnicodeCodePoints(input.topic) > MAX_CORRECTION_TOPIC_CODE_POINTS) {
    errors.topic = 'Chủ đề không được vượt quá 80 ký tự.';
  }
  if (input.cefrLevel && !COMMUNITY_CEFR_LEVELS.includes(input.cefrLevel as CommunityCefrLevel)) {
    errors.cefrLevel = 'Vui lòng chọn trình độ CEFR hợp lệ.';
  }
  if (!COMMUNITY_VISIBILITIES.includes(input.visibility as CommunityVisibility)) {
    errors.visibility = 'Vui lòng chọn phạm vi hiển thị hợp lệ.';
  }
}
