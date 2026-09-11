import { CEFR_LEVELS, type CefrLevel, type LanguageHubFilters } from '../languages.types';

const TOPIC_PATTERN = /^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u;
const MAX_TOPIC_LENGTH = 80;

export interface ParsedLanguageHubSearch extends LanguageHubFilters {
  issue: 'invalid' | null;
}

export function parseLanguageHubSearch(search: string): ParsedLanguageHubSearch {
  const params = new URLSearchParams(search);
  const rawLevels = params.getAll('level');
  const levelResult = normalizeLevelValues(rawLevels);
  const rawTopic = params.get('topic');
  const topicResult = normalizeTopicValue(rawTopic);

  return {
    levels: levelResult.value,
    topic: topicResult.value,
    issue: levelResult.invalid || topicResult.invalid ? 'invalid' : null,
  };
}

export function buildLanguageHubSearch(filters: LanguageHubFilters): string {
  const params = new URLSearchParams();
  const levels = normalizeLevelValues(filters.levels).value;
  const topic = normalizeTopicValue(filters.topic).value;

  if (levels.length > 0) params.set('level', levels.join(','));
  if (topic) params.set('topic', topic);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function normalizeLanguageHubTopic(value: string | null | undefined): string | null {
  return normalizeTopicValue(value).value;
}

function normalizeLevelValues(
  values: readonly string[] | undefined,
): { value: CefrLevel[]; invalid: boolean } {
  if (values === undefined || values.length === 0) return { value: [], invalid: false };

  const tokens = values.flatMap((value) => value.split(','));
  if (tokens.some((value) => value.trim().length === 0)) return { value: [], invalid: true };

  const normalized = tokens.map((value) => value.normalize('NFKC').trim().toUpperCase());
  if (normalized.some((value) => !isCefrLevel(value))) return { value: [], invalid: true };

  return {
    value: [...new Set(normalized as CefrLevel[])].sort(
      (left, right) => CEFR_LEVELS.indexOf(left) - CEFR_LEVELS.indexOf(right),
    ),
    invalid: false,
  };
}

function normalizeTopicValue(
  value: string | null | undefined,
): { value: string | null; invalid: boolean } {
  if (value === undefined || value === null) return { value: null, invalid: false };
  if (value.trim().length === 0) return { value: null, invalid: false };

  let topic: string;
  try {
    topic = value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/gu, '-');
  } catch {
    return { value: null, invalid: true };
  }

  if (topic.length === 0) return { value: null, invalid: false };
  if (topic.length > MAX_TOPIC_LENGTH || !TOPIC_PATTERN.test(topic)) {
    return { value: null, invalid: true };
  }
  return { value: topic, invalid: false };
}

function isCefrLevel(value: string): value is CefrLevel {
  return CEFR_LEVELS.includes(value as CefrLevel);
}
