import { CEFR_LEVELS, type LanguageCatalogItem } from '../languages/languages.types';
import {
  LIBRARY_CONTRIBUTION_RESOURCE_TYPES,
  type ContributionFormDetails,
  type ContributionValidationResult,
  type LibraryContributionFormState,
  type LibraryContributionPolicy,
  type LibraryContributionResourceType,
} from './library.contribution.types';

const TOPIC_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export function validateContributionForm(
  form: LibraryContributionFormState,
  policy: LibraryContributionPolicy,
  languages: LanguageCatalogItem[],
): ContributionValidationResult {
  const errors: Record<string, string> = {};
  const approvedTypes = getApprovedContributionTypes(policy);
  const activeCodes = new Set(languages.filter((language) => language.active).map((language) => language.code.toLowerCase()));

  if (!form.resourceType) {
    errors.resourceType = 'Chọn loại tài nguyên để tiếp tục.';
  } else if (!approvedTypes.includes(form.resourceType)) {
    errors.resourceType = 'Loại tài nguyên này hiện chưa được nhận đóng góp.';
  }

  if (!form.primaryLanguageCode) errors.primaryLanguageCode = 'Chọn ngôn ngữ chính.';
  else if (!activeCodes.has(form.primaryLanguageCode.toLowerCase())) errors.primaryLanguageCode = 'Ngôn ngữ này hiện không khả dụng.';

  if (form.resourceType === 'TRANSLATION') {
    if (!form.secondaryLanguageCode) errors.secondaryLanguageCode = 'Chọn ngôn ngữ đích.';
    else if (!activeCodes.has(form.secondaryLanguageCode.toLowerCase())) errors.secondaryLanguageCode = 'Ngôn ngữ này hiện không khả dụng.';
    else if (form.secondaryLanguageCode.toLowerCase() === form.primaryLanguageCode.toLowerCase()) {
      errors.secondaryLanguageCode = 'Ngôn ngữ nguồn và đích phải khác nhau.';
    }
  }

  const topics = normalizeTopics(form.topicsText, errors);
  if (!isValidCefr(form.cefrLevel)) errors.cefrLevel = 'Chọn một mức CEFR hợp lệ.';
  const details = normalizeDetails(form.resourceType, form.details, errors);

  if (!form.attribution.trim()) errors.attribution = 'Nhập tên hoặc cách ghi công bạn muốn hiển thị.';
  else if (Array.from(normalizeText(form.attribution)).length > 2_000) errors.attribution = 'Cách ghi công không được dài quá 2.000 ký tự.';

  const eligibleLicense = policy.licenses.find((license) => license.licenseKey === form.licenseKey);
  if (!form.licenseKey) errors.licenseKey = 'Chọn một giấy phép phù hợp.';
  else if (!eligibleLicense) errors.licenseKey = 'Giấy phép đã chọn không còn khả dụng.';

  if (form.rightsConfirmed !== true) errors.rightsConfirmed = 'Xác nhận quyền đóng góp của bạn.';
  if (form.reuseConsent !== true) errors.reuseConsent = 'Xác nhận cho phép tái sử dụng công khai.';

  if (Object.keys(errors).length > 0 || !form.resourceType || !details || !eligibleLicense) {
    return { errors, snapshot: null };
  }

  return {
    errors,
    snapshot: {
      resourceType: form.resourceType,
      primaryLanguageCode: form.primaryLanguageCode.trim().toLowerCase(),
      secondaryLanguageCode: form.resourceType === 'TRANSLATION' ? form.secondaryLanguageCode.trim().toLowerCase() : null,
      cefrLevel: form.cefrLevel || null,
      topics,
      details,
      attribution: normalizeText(form.attribution),
      licenseKey: eligibleLicense.licenseKey,
      termsVersion: policy.termsVersion,
      rightsConfirmed: true,
      reuseConsent: true,
    },
  };
}

export function getApprovedContributionTypes(policy: LibraryContributionPolicy): LibraryContributionResourceType[] {
  return LIBRARY_CONTRIBUTION_RESOURCE_TYPES.filter((type) => policy.approvedResourceTypes.includes(type));
}

export function validateContributionStep(
  form: LibraryContributionFormState,
  policy: LibraryContributionPolicy,
  languages: LanguageCatalogItem[],
  step: number,
): Record<string, string> {
  const full = validateContributionForm(form, policy, languages).errors;
  const fieldsByStep: Record<number, string[]> = {
    0: ['resourceType', 'primaryLanguageCode', 'secondaryLanguageCode', 'cefrLevel'],
    1: ['topics', 'term', 'definition', 'partOfSpeech', 'exampleSentence', 'text', 'context', 'sourceText', 'translatedText'],
    2: ['attribution', 'licenseKey'],
    3: ['rightsConfirmed', 'reuseConsent'],
  };
  const fields = fieldsByStep[step] ?? [];
  return Object.fromEntries(fields.filter((field) => full[field]).map((field) => [field, full[field]]));
}

function normalizeDetails(
  resourceType: LibraryContributionFormState['resourceType'],
  details: ContributionFormDetails,
  errors: Record<string, string>,
): ContributionFormDetails | null {
  if (!resourceType) return null;

  if (resourceType === 'VOCABULARY') {
    if (!isDetailsType(details, 'VOCABULARY')) return null;
    const term = required(details.term, errors, 'term', 500);
    const definition = required(details.definition, errors, 'definition', 5_000);
    const partOfSpeech = optional(details.partOfSpeech, errors, 'partOfSpeech', 80);
    const exampleSentence = optional(details.exampleSentence, errors, 'exampleSentence', 20_000);
    return { resourceType, term, definition, partOfSpeech, exampleSentence };
  }

  if (resourceType === 'SENTENCE') {
    if (!isDetailsType(details, 'SENTENCE')) return null;
    const text = required(details.text, errors, 'text', 20_000);
    const context = optional(details.context, errors, 'context', 5_000);
    return { resourceType, text, context };
  }

  if (!isDetailsType(details, 'TRANSLATION')) return null;
  const sourceText = required(details.sourceText, errors, 'sourceText', 20_000);
  const translatedText = required(details.translatedText, errors, 'translatedText', 20_000);
  return { resourceType, sourceText, translatedText };
}

function normalizeTopics(input: string, errors: Record<string, string>): string[] {
  if (!input.trim()) return [];
  const topics = input.split(',').map((topic) => normalizeTopic(topic));
  const uniqueTopics = [...new Set(topics.filter(Boolean))];
  if (uniqueTopics.length > 20) errors.topics = 'Bạn có thể thêm tối đa 20 chủ đề.';
  if (topics.some((topic) => !topic || Array.from(topic).length > 80 || !TOPIC_PATTERN.test(topic))) {
    errors.topics = 'Mỗi chủ đề cần là chữ, số hoặc dấu gạch nối và dài tối đa 80 ký tự.';
  }
  return uniqueTopics;
}

function normalizeTopic(topic: string): string {
  return normalizeText(topic).toLowerCase().replace(/[\s_]+/gu, '-');
}

function required(value: string, errors: Record<string, string>, field: string, maxLength: number): string {
  const normalized = normalizeText(value);
  if (!normalized) errors[field] = 'Trường này không được để trống.';
  else if (Array.from(normalized).length > maxLength) errors[field] = `Không được dài quá ${maxLength.toLocaleString('vi-VN')} ký tự.`;
  return normalized;
}

function optional(value: string, errors: Record<string, string>, field: string, maxLength: number): string {
  const normalized = normalizeText(value);
  if (Array.from(normalized).length > maxLength) errors[field] = `Không được dài quá ${maxLength.toLocaleString('vi-VN')} ký tự.`;
  return normalized;
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/\r\n?/gu, '\n').trim();
}

function isDetailsType<T extends ContributionFormDetails['resourceType']>(
  details: ContributionFormDetails,
  type: T,
): details is Extract<ContributionFormDetails, { resourceType: T }> {
  return details.resourceType === type;
}

export function isValidCefr(value: string): boolean {
  return !value || CEFR_LEVELS.includes(value as (typeof CEFR_LEVELS)[number]);
}
