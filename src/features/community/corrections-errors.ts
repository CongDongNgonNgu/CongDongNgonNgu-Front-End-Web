import { ApiClientError } from '../../services/api-client';
import { translate, type UiLocale, type TranslationKey } from '../ui-locale/ui-locale';

type RequestKind = 'correction' | 'question';

export function communityRequestErrorMessage(error: unknown, kind: RequestKind, locale: UiLocale = 'vi'): string {
  const t = (key: TranslationKey) => translate(locale, key);
  const noun = t(kind === 'correction' ? 'community.posts.request.correction' : 'community.posts.request.question');
  const failed = () => translate(locale, 'community.posts.request.failed', { kind: noun });
  if (!(error instanceof ApiClientError)) return failed();
  if (error.status === 400) {
    if (error.code.includes('LANGUAGE')) return t("community.posts.the.target.language.is.no.longer.available.please");
    if (error.code.includes('TEXT') || error.code.includes('CONTENT')) return t("community.posts.the.content.is.invalid.please.check.the.marked");
    return translate(locale, 'community.posts.request.invalid', { kind: noun });
  }
  if (error.status === 401) return t("community.posts.your.session.has.expired.please.sign.in.again");
  if (error.status === 403) return t("community.posts.your.account.cannot.submit.this.content.right.now");
  if (error.status === 404) return t("community.posts.the.language.or.community.space.is.no.longer");
  if (error.status === 409) return translate(locale, 'community.posts.request.conflict', { kind: noun });
  if (error.status === 429) return t("community.posts.you.have.sent.too.many.requests.please.try");
  if (error.status >= 500) return t("community.posts.the.service.is.busy.your.draft.has.been");
  return failed();
}
