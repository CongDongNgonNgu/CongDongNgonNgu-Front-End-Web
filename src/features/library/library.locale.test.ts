import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../../services/api-client';
import { libraryLearningErrorKey, librarySearchErrorKey } from './library.errors';
import { contentLanguage, resourceTypeLabelKey } from './library.presentation';
import { translate } from '../ui-locale/ui-locale';

describe('Library localized contract boundaries', () => {
  it.each([[429, 'errors.learningQuota'], [503, 'errors.learningOffline'], [404, 'errors.learningIneligible'], [422, 'errors.learningIneligible'], [401, 'errors.learningAccess'], [403, 'errors.learningAccess'], [500, 'errors.learningUnavailable']] as const)('maps status %s without exposing server text', (status, key) => {
    expect(libraryLearningErrorKey(new ApiClientError('internal-exception-do-not-display', status, 'UNKNOWN'))).toBe(key);
    expect(translate('en', libraryLearningErrorKey(new ApiClientError('internal-exception-do-not-display', status, 'UNKNOWN')))).not.toContain('internal-exception');
  });
  it('uses safe search fallback and keeps unknown/prototype resource types out of catalog lookup', () => {
    expect(librarySearchErrorKey(new Error('internal database details'))).toBe('errors.libraryUnavailable');
    expect(librarySearchErrorKey(new ApiClientError('rate', 429, 'RATE'))).toBe('errors.libraryRateLimit');
    expect(resourceTypeLabelKey('VOCABULARY')).toBe('library.typeVocabulary');
    expect(resourceTypeLabelKey('__proto__')).toBe('library.content');
    expect(resourceTypeLabelKey('unrecognized')).toBe('library.content');
  });
  it('preserves real content language independently and rejects malformed metadata', () => {
    expect(contentLanguage('vi')).toBe('vi');
    expect(contentLanguage('ar')).toBe('ar');
    expect(contentLanguage('zh-Hant')).toBe('zh-Hant');
    expect(contentLanguage(null)).toBeUndefined();
    expect(contentLanguage('../../en')).toBeUndefined();
  });
});
