import { localizedOnboardingOptions } from '../onboarding/onboarding.constants';
import type { UiLocale, TranslationKey } from '../ui-locale/ui-locale';
import type { ExchangeReportCategory, RelationshipState } from './exchange.types';

// Canonical API codes remain independent of semantic UI catalog keys.
export const relationshipStateKeys: Record<RelationshipState, TranslationKey> = {
  NONE: 'exchange.state.NONE', OUTGOING_PENDING: 'exchange.state.OUTGOING-PENDING',
  INCOMING_PENDING: 'exchange.state.INCOMING-PENDING', CONNECTED: 'exchange.state.CONNECTED',
};
export const relationshipDescriptionKeys: Record<RelationshipState, TranslationKey> = {
  NONE: 'exchange.description.NONE', OUTGOING_PENDING: 'exchange.description.OUTGOING-PENDING',
  INCOMING_PENDING: 'exchange.description.INCOMING-PENDING', CONNECTED: 'exchange.description.CONNECTED',
};
export const reportCategoryKeys: Record<ExchangeReportCategory, TranslationKey> = {
  SPAM: 'exchange.report.SPAM', HARASSMENT: 'exchange.report.HARASSMENT',
  INAPPROPRIATE_CONTENT: 'exchange.report.INAPPROPRIATE-CONTENT',
  IMPERSONATION: 'exchange.report.IMPERSONATION', SAFETY_CONCERN: 'exchange.report.SAFETY-CONCERN',
  OTHER: 'exchange.report.OTHER',
};
// Only known product goal codes have localized labels. Member text stays verbatim.
export function goalDisplay(value: string, locale: UiLocale): string {
  return localizedOnboardingOptions(locale).GOAL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
