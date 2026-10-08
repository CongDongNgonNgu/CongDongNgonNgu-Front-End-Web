import { translate, type TranslationKey, type UiLocale } from '../ui-locale/ui-locale';
import { languageDisplayName } from '../ui-locale/language-display';
import type { DiscoveryLanguage } from './exchange.types';
import { goalDisplay } from './exchange-copy';

const fixedReasons: Record<string, TranslationKey> = {
  'Mức độ bạn chọn tương thích với hồ sơ ngôn ngữ của nhau.': 'exchange.reason.level',
  'Múi giờ tương thích.': 'exchange.reason.timezone',
  'Có khoảng thời gian học phù hợp.': 'exchange.reason.availability',
};
// Adapter for the current matching-engine buildReasons contract. Never render unknown server text.
export function matchingReasonDisplay(reason: string, languages: readonly DiscoveryLanguage[], locale: UiLocale): string {
  const t = (key: TranslationKey) => translate(locale, key);
  if (Object.prototype.hasOwnProperty.call(fixedReasons, reason)) return t(fixedReasons[reason]);
  const forward = /^Họ có thể hỗ trợ (.+); bạn đang muốn học (.+)\.$/.exec(reason);
  const backward = /^Bạn có thể hỗ trợ (.+); họ đang muốn học (.+)\.$/.exec(reason);
  const match = forward ?? backward;
  if (match && match[1] === match[2]) {
    const language = languages.find((item) => (forward ? item.offered : item.wanted) && (item.englishName === match[1] || item.code === match[1]));
    if (language) return translate(locale, forward ? 'exchange.reason.forward' : 'exchange.reason.backward', { language: languageDisplayName(language, locale) });
  }
  const goals = /^Mục tiêu chung: (.+)\.$/.exec(reason);
  if (goals) return translate(locale, 'exchange.reason.goals', { topics: goals[1].split(', ').map((goal) => goalDisplay(goal, locale)).join(', ') });
  const interests = /^Sở thích chung: (.+)\.$/.exec(reason);
  if (interests) return translate(locale, 'exchange.reason.interests', { topics: interests[1] });
  return t('exchange.reason.unknown');
}
