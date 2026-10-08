import { ApiClientError } from '../../services/api-client';
import { translate, type TranslationKey, type UiLocale } from '../ui-locale/ui-locale';

const messages: Readonly<Record<string, TranslationKey>> = {
  "AUTH_INVALID_CREDENTIALS": "auth.incorrect.email.or.password",
  "AUTH_EMAIL_VERIFICATION_REQUIRED": "auth.verify.your.email.before.signing.in",
  "AUTH_ACCOUNT_DISABLED": "auth.your.account.is.temporarily.disabled.please.contact",
  "AUTH_RATE_LIMITED": "auth.please.try.again.in.a.few.minutes",
  "AUTH_CSRF_INVALID": "auth.this.form.session.has.expired.reload.the",
  "AUTH_SESSION_EXPIRED": "auth.your.signin.session.has.expired.please.sign",
  "AUTH_PROVIDER_DISABLED": "auth.this.method.is.currently.unavailable",
  "AUTH_PROVIDER_UNAVAILABLE": "auth.this.method.is.temporarily.unavailable",
  "AUTH_OAUTH_FAILED": "auth.could.not.complete.signin.with.this.provider",
  "AUTH_ACCOUNT_COLLISION": "auth.this.email.already.has.an.account.sign",
  "AUTH_VERIFICATION_INVALID": "auth.the.verification.link.is.invalid.or.expired",
  "AUTH_RESET_INVALID": "auth.the.password.reset.link.is.invalid.or"
};

export function authErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiClientError) {
    return Object.prototype.hasOwnProperty.call(messages, error.code)
      ? messages[error.code]
      : error.status >= 500 ? 'auth.the.system.is.busy.please.try.again' : 'auth.something.went.wrong.please.try.again.later';
  }
  return 'auth.something.went.wrong.please.try.again.later';
}
export function authErrorMessage(error: unknown, locale: UiLocale = 'vi'): string {
  return translate(locale, authErrorKey(error));
}
