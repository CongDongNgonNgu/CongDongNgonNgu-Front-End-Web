import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorKey } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';
import flowStyles from '../AuthFlow.module.css';

const recoveryStatuses = new Set(['error', 'provider-disabled', 'session-expired', 'expired', 'collision', 'oauth-collision', 'linking']);

const recoveryCopy: Record<string, { eyebrow: TranslationKey; title: TranslationKey; description: TranslationKey; message: TranslationKey }> = {
  error: {
    eyebrow: "auth.signin.incomplete",
    title: "auth.could.not.complete.signin",
    description: "auth.return.and.try.signing.in.with.email",
    message: "auth.this.signin.method.did.not.complete.please",
  },
  'provider-disabled': {
    eyebrow: "auth.provider.not.ready",
    title: "auth.method.unavailable",
    description: "auth.signin.with.this.provider.is.not.ready",
    message: "auth.please.sign.in.with.email.and.password",
  },
  'session-expired': {
    eyebrow: "auth.sign.in.again",
    title: "auth.your.session.has.expired",
    description: "auth.to.protect.your.learning.data.and.account",
    message: "auth.your.work.and.text.being.translated.are",
  },
  expired: {
    eyebrow: "auth.sign.in.again",
    title: "auth.your.session.has.expired",
    description: "auth.to.protect.your.learning.data.and.account",
    message: "auth.your.work.and.text.being.translated.are",
  },
  collision: {
    eyebrow: "auth.account.linking.recovery",
    title: "auth.could.not.link.accounts",
    description: "auth.to.protect.your.privacy.we.could.not",
    message: "auth.sign.in.with.your.existing.email.and",
  },
  'oauth-collision': {
    eyebrow: "auth.account.linking.recovery",
    title: "auth.could.not.link.accounts",
    description: "auth.to.protect.your.privacy.we.could.not",
    message: "auth.sign.in.with.your.existing.email.and",
  },
  linking: {
    eyebrow: "auth.account.linking.recovery.n2",
    title: "auth.could.not.link.accounts",
    description: "auth.to.protect.your.privacy.we.could.not",
    message: "auth.sign.in.with.your.existing.email.and",
  },
};

export function AuthCallbackPage() {
  const { t } = useUiLocale();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const code = searchParams.get('code');
  const [error, setError] = useState<TranslationKey | ''>('');
  const attempted = useRef(false);
  const recoveryStatus = status === 'error' && code === 'AUTH_ACCOUNT_COLLISION' ? 'collision' : status;
  const isRecoveryError = recoveryStatuses.has(recoveryStatus ?? '');
  const copy = recoveryCopy[recoveryStatus ?? ''] ?? recoveryCopy.error;

  useEffect(() => {
    if (attempted.current || isRecoveryError) return;
    attempted.current = true;
    void refresh()
      .then(() => navigate('/', { replace: true }))
      .catch((reason) => setError(authErrorKey(reason)));
  }, [isRecoveryError, navigate, refresh]);

  const hasError = isRecoveryError || Boolean(error);

  return (
    <AuthBody
      eyebrow={hasError ? t(copy.eyebrow) : t("auth.sign.in.n06")}
      title={hasError ? t(copy.title) : t("auth.opening.your.space")}
      description={hasError ? t(copy.description) : t("auth.we.are.checking.your.secure.signin.session")}
      editorialEyebrow={hasError ? t(copy.eyebrow) : t("auth.a.safe.learning.space")}
      editorialTitle={hasError ? t("auth.regain.control.of.your.account") : t("auth.opening.your.space.n2")}
      editorialDescription={t("auth.every.authentication.step.is.handled.transparently.to")}
      editorialItems={[
        { icon: 'lock', title: t("auth.protect.personal.data"), description: t("auth.sensitive.information.is.kept.out.of.error") },
        { icon: 'check-circle', title: t("auth.continue.safely"), description: t("auth.you.can.always.return.and.sign.in") },
        { icon: 'circle-help', title: t("auth.need.help"), description: t("auth.the.community.team.can.guide.you.through") },
      ]}
      editorialPrompt={<p><Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in")}</Link></p>}
      mobileReassuranceTitle={t("auth.secure.signin.sessions")}
      mobileReassuranceText={t("auth.we.keep.sensitive.details.out.of.authentication")}
    >
      {hasError ? (
        <div className={flowStyles.authState}>
          <div className={flowStyles.flowErrorCard} role='alert'>
            <strong>{t(copy.title)}</strong>
            <span>{t(error || copy.message)}</span>
          </div>
          <Link className={flowStyles.flowButton} to='/login'>{t("auth.back.to.sign.in")}</Link>
        </div>
      ) : (
        <p className={feedbackStyles.statusMessage} role='status'>{t("auth.confirming")}</p>
      )}
    </AuthBody>
  );
}
