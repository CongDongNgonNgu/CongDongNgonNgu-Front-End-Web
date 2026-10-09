import type { LanguageHubFilters } from '../languages.types';

export const HUB_CORE_KEYS = ['vocabulary', 'sentences', 'resources'] as const;
export type HubCoreKey = typeof HUB_CORE_KEYS[number];

// Navigation over approved canonical product paths, not an inventory or authorization projection.
export function buildHubJourneys(language: { code: string }, filters: LanguageHubFilters) {
  return HUB_CORE_KEYS.map((key) => {
    const query = new URLSearchParams({ language: language.code });
    if (key !== 'resources') query.set('type', key === 'vocabulary' ? 'VOCABULARY' : 'SENTENCE');
    // Legacy multi-level URLs require an explicit choice in the Hub UI; Library accepts one level.
    if (filters.levels.length === 1) query.set('level', filters.levels[0]);
    if (filters.topic) query.set('topic', filters.topic);
    return { key, href: '/library?' + query.toString() };
  });
}

export const HUB_DEFERRED_KEYS = ['grammar', 'pronunciation', 'practice'] as const;
export function buildHubSocialJourneys(language: { code: string }) {
  return [
    { key: 'community', href: '/community?' + new URLSearchParams({ languageCode: language.code }) },
    { key: 'questions', href: '/community/ask/question' },
    { key: 'exchange', href: '/exchange' },
  ] as const;
}
