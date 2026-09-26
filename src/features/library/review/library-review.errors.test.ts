import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../../../services/api-client';
import { getLibraryReviewErrorMessage, isReviewConflict, isSourceStillValid } from './library-review.errors';

describe('library review error mapping', () => {
  it('maps the self-verification domain error safely', () => {
    const error = new ApiClientError('self', 403, 'LIBRARY_SELF_VERIFICATION_DENIED');
    expect(getLibraryReviewErrorMessage(error)).toContain('tự xác minh');
  });

  it('recognizes deterministic conflict and stale-source errors', () => {
    expect(isReviewConflict({ code: 'LIBRARY_REVIEW_CONFLICT' })).toBe(true);
    expect(isSourceStillValid({ code: 'LIBRARY_SOURCE_STILL_VALID' })).toBe(true);
  });
});
