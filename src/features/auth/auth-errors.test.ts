import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../../services/api-client';
import { authErrorMessage } from './auth-errors';
describe('safe localized auth errors', () => {
  it('maps known credential failures in both locales', () => {
    const error = new ApiClientError('private account data', 401, 'AUTH_INVALID_CREDENTIALS');
    expect(authErrorMessage(error, 'vi')).toBe('Email hoặc mật khẩu không đúng.');
    expect(authErrorMessage(error, 'en')).toBe('Incorrect email or password.');
  });
  it('rejects prototype property names as unknown error codes', () => {
    expect(authErrorMessage(new ApiClientError('private data', 400, 'constructor'), 'en')).toBe('Something went wrong. Please try again later.');
  });
  it.each([400, 403, 500])('never displays raw backend details for unknown status %s', (status) => {
    const result = authErrorMessage(new ApiClientError('secret@example.test SQL SELECT access_token', status, 'UNKNOWN'), 'en');
    expect(result).not.toMatch(/secret|SQL|access_token/);
    expect(result).toBe(status >= 500 ? 'The system is busy. Please try again later.' : 'Something went wrong. Please try again later.');
  });
  it('uses a safe fallback for non-API errors', () => {
    expect(authErrorMessage(new Error('private data'), 'en')).toBe('Something went wrong. Please try again later.');
  });
});
