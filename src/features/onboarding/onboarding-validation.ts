import {
  PROFICIENCY_VALUES,
  type OnboardingDraft,
  type OnboardingValidationErrors,
} from './onboarding.types';
import { timeToMinutes, unique } from './onboarding.utils';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const END_TIME_PATTERN = /^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/;

export function validateDraftForStep(draft: OnboardingDraft, step: number, messageKeys = false): OnboardingValidationErrors {
  const errors: OnboardingValidationErrors = {};
  if (step >= 0 && draft.nativeCodes.length === 0 && draft.knownCodes.length === 0) {
    errors.spokenLanguages = messageKeys ? 'onboarding.please.choose.at.least.one.language.you.speak' : 'Vui lòng chọn ít nhất một ngôn ngữ bạn nói.';
  }
  if (step >= 1 && draft.learningCodes.length === 0) {
    errors.learningLanguages = messageKeys ? 'onboarding.please.choose.at.least.one.language.you.want.to.learn' : 'Vui lòng chọn ít nhất một ngôn ngữ bạn muốn học.';
  }
  if (step >= 2) {
    const missingLevel = unique([...draft.knownCodes, ...draft.learningCodes])
      .filter((code) => !draft.nativeCodes.includes(code))
      .some((code) => !PROFICIENCY_VALUES.includes(draft.levels[code]));
    if (missingLevel) errors.levels = messageKeys ? 'onboarding.choose.your.current.proficiency.for.each.language' : 'Hãy chọn trình độ hiện tại cho mỗi ngôn ngữ.';
  }
  if (step >= 3) {
    if (draft.goals.length === 0) errors.goals = messageKeys ? 'onboarding.choose.at.least.one.goal.to.personalize.suggestions' : 'Chọn ít nhất một mục tiêu để cá nhân hóa gợi ý.';
    if (draft.skills.length === 0) errors.skills = messageKeys ? 'onboarding.choose.at.least.one.skill.you.want.to.practice' : 'Chọn ít nhất một kỹ năng bạn muốn luyện tập.';
  }
  if (step >= 4 && draft.availability.some((window) => !isValidAvailability(window))) {
    errors.availability = messageKeys ? 'onboarding.check.the.times.you.added' : 'Kiểm tra lại thời gian bạn đã thêm.';
  }
  return errors;
}

function isValidAvailability(value: { dayOfWeek: number; startTime: string; endTime: string }): boolean {
  return Number.isInteger(value.dayOfWeek) && value.dayOfWeek >= 1 && value.dayOfWeek <= 7
    && TIME_PATTERN.test(value.startTime)
    && END_TIME_PATTERN.test(value.endTime)
    && timeToMinutes(value.startTime) < timeToMinutes(value.endTime);
}
