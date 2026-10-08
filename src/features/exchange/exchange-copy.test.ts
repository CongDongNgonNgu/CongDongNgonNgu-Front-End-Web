import { describe, expect, it } from 'vitest';
import { goalDisplay, relationshipStateKeys, reportCategoryKeys } from './exchange-copy';
import { localizedOnboardingOptions } from '../onboarding/onboarding.constants';
import { translate } from '../ui-locale/ui-locale';

describe('exchange canonical labels', () => {
 it.each(['vi', 'en'] as const)('uses the shared onboarding labels for all known goals in %s', (locale) => {
  for (const goal of localizedOnboardingOptions(locale).GOAL_OPTIONS) expect(goalDisplay(goal.value, locale)).toBe(goal.label);
  expect(goalDisplay('custom_goal_文字', locale)).toBe('custom_goal_文字');
 });
 it('keeps canonical status and report codes independent from semantic keys', () => {
  expect(translate('en', relationshipStateKeys.OUTGOING_PENDING)).toBe('Request sent');
  expect(translate('en', reportCategoryKeys.INAPPROPRIATE_CONTENT)).toBe('Inappropriate content');
  expect(translate('vi', reportCategoryKeys.SAFETY_CONCERN)).toBe('Lo ngại về an toàn');
 });
});
