import { COMMUNITY_POST_TYPES, type CommunityPostQuery } from './community.types';

export type CommunitySearchQuery = Omit<CommunityPostQuery, 'limit' | 'cursor'>;
const supportedKeys = new Set(['q', 'languageCode', 'postType', 'topic', 'responseState', 'savedByMe', 'sort']);
const responseStates = ['UNANSWERED', 'ANSWERED', 'ACCEPTED'] as const;

/** URL input is untrusted. Invalid selections must be shown as invalid, never relabelled. */
export function parseCommunitySearch(params: URLSearchParams): { query: CommunitySearchQuery; invalid: boolean } {
  const query: CommunitySearchQuery = {};
  let invalid = [...params.keys()].some((key) => !supportedKeys.has(key) || params.getAll(key).length > 1);
  const q = params.get('q')?.normalize('NFKC').trim();
  if (q) { if (Array.from(q).length <= 120 && !/[\u0000-\u001f\u007f]/u.test(q)) query.q = q; else invalid = true; }
  const language = params.get('languageCode')?.normalize('NFKC').trim().toLowerCase();
  if (language) { if (language.length <= 35 && /^[a-z]{2,35}(?:-[a-z0-9]{2,8})*$/u.test(language)) query.languageCode = language; else invalid = true; }
  const type = params.get('postType');
  if (type) { if (COMMUNITY_POST_TYPES.includes(type as typeof COMMUNITY_POST_TYPES[number])) query.postType = type as typeof COMMUNITY_POST_TYPES[number]; else invalid = true; }
  const topic = params.get('topic')?.normalize('NFKC').trim().toLowerCase().replace(/[\s_]+/gu, '-');
  if (topic) { if (Array.from(topic).length <= 80 && /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(topic)) query.topic = topic; else invalid = true; }
  const state = params.get('responseState');
  if (state) {
    if (responseStates.includes(state as typeof responseStates[number])) {
      if (type && type !== 'QUESTION') invalid = true;
      else { query.postType = 'QUESTION'; query.responseState = state as typeof responseStates[number]; }
    } else invalid = true;
  }
  const saved = params.get('savedByMe');
  if (saved === 'true') query.savedByMe = true;
  else if (saved && saved !== 'false') invalid = true;
  const sort = params.get('sort');
  if (sort === 'USEFUL') query.sort = sort;
  else if (sort && sort !== 'NEWEST') invalid = true;
  return { query, invalid };
}

export function serializeCommunitySearch(query: CommunitySearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['q', 'languageCode', 'postType', 'topic', 'responseState'] as const) {
    if (query[key]) params.set(key, query[key]);
  }
  if (query.savedByMe) params.set('savedByMe', 'true');
  if (query.sort === 'USEFUL') params.set('sort', query.sort);
  return params;
}
