import { ApiClientError } from '../../services/api-client';
import type { viErrors } from '../ui-locale/catalogs/errors';

export function librarySearchErrorKey(error: unknown): keyof typeof viErrors {
  return error instanceof ApiClientError && error.status === 429 ? 'errors.libraryRateLimit' : 'errors.libraryUnavailable';
}

export function libraryLearningErrorKey(error: unknown): keyof typeof viErrors {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return 'errors.learningQuota';
    if (error.status === 503) return 'errors.learningOffline';
    if (error.status === 404 || error.status === 422) return 'errors.learningIneligible';
    if (error.status === 401 || error.status === 403) return 'errors.learningAccess';
  }
  return 'errors.learningUnavailable';
}
