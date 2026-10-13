import { translate, type UiLocale } from '../ui-locale/ui-locale';
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
  input: CorrectionRequestFormInput, locale: UiLocale = 'vi',
): CorrectionRequestValidationErrors {
  const errors: CorrectionRequestValidationErrors = {};

  if (!input.languageCode) errors.languageCode = translate(locale, "community.posts.please.choose.a.target.language");
  if (!CORRECTION_INTENTS.includes(input.correctionIntent as CorrectionIntent)) {
    errors.correctionIntent = translate(locale, "community.posts.please.choose.what.you.would.like.help.with");
  }
  const originalTextLength = countUnicodeCodePoints(input.originalText);
  if (!input.originalText.trim()) {
    errors.originalText = translate(locale, "community.posts.text.must.contain.a.character.other.than.whitespace");
  } else if (originalTextLength > MAX_CORRECTION_TEXT_CODE_POINTS) {
    errors.originalText = translate(locale, "community.posts.content.must.not.exceed.twentyThousand.characters");
  }
  if (countUnicodeCodePoints(input.context) > MAX_CORRECTION_CONTEXT_CODE_POINTS) {
    errors.context = translate(locale, "community.posts.context.must.not.exceed.fiveThousand.characters");
  }
  validateMetadata(input, errors, locale);
  return errors;
}

export function validateQuestionInput(input: QuestionFormInput, locale: UiLocale = 'vi'): QuestionValidationErrors {
  const errors: QuestionValidationErrors = {};
  if (!input.languageCode) errors.languageCode = translate(locale, "community.posts.please.choose.a.target.language");
  const contentLength = countUnicodeCodePoints(input.content);
  if (!input.content.trim()) {
    errors.content = translate(locale, "community.posts.a.question.cannot.contain.only.whitespace");
  } else if (contentLength > MAX_CORRECTION_TEXT_CODE_POINTS) {
    errors.content = translate(locale, "community.posts.a.question.must.not.exceed.twentyThousand.characters");
  }
  validateMetadata(input, errors, locale);
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
  errors: Partial<Record<'cefrLevel' | 'topic' | 'visibility', string>>, locale: UiLocale = 'vi',
): void {
  if (input.topic && countUnicodeCodePoints(input.topic) > MAX_CORRECTION_TOPIC_CODE_POINTS) {
    errors.topic = translate(locale, "community.posts.topic.must.not.exceed.eighty.characters");
  }
  if (input.cefrLevel && !COMMUNITY_CEFR_LEVELS.includes(input.cefrLevel as CommunityCefrLevel)) {
    errors.cefrLevel = translate(locale, "community.posts.please.choose.a.valid.cefr.level");
  }
  if (!COMMUNITY_VISIBILITIES.includes(input.visibility as CommunityVisibility)) {
    errors.visibility = translate(locale, "community.posts.please.choose.a.valid.visibility.scope");
  }
}
