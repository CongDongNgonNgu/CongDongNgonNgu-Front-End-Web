import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorKey } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';
import flowStyles from '../AuthFlow.module.css';

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function VerifyEmailPage() {
  const { t } = useUiLocale();
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [state, setState] = useState<'checking' | 'verified' | 'invalid' | 'idle'>(token ? 'checking' : 'idle');
  const [message, setMessage] = useState<TranslationKey | ''>('');
  const [loading, setLoading] = useState(false);
  const attemptedToken = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;
    void api.verifyEmail(token)
      .then(() => {
        setState('verified');
        setMessage("auth.your.email.has.been.verified.you.can");
      })
      .catch((reason) => {
        setState('invalid');
        setMessage(authErrorKey(reason));
      });
  }, [api, token]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!email.includes('@') || !email.includes('.')) {
      setMessage("auth.please.enter.a.valid.email.address");
      formRef.current?.querySelector<HTMLInputElement>('input[type=email]')?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.resendVerification(email.trim().toLowerCase());
      setMessage("auth.if.the.account.is.eligible.a.new");
    } catch (reason) {
      setMessage(authErrorKey(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow={t("auth.email.verification")}
      title={state === 'verified' ? t("auth.email.verified") : t("auth.verify.your.email.address.to.continue")}
      description={t("auth.a.secure.confirmation.link.has.been.sent")}
      editorialEyebrow={t("auth.protect.your.account")}
      editorialTitle={t("auth.trust.begins.with.clarity")}
      editorialDescription={t("auth.email.verification.protects.your.account.and.opens")}
      editorialItems={[
        { icon: 'lock', title: t("auth.singleuse.verification.link"), description: t("auth.verification.links.expire.to.protect.your.exchange") },
        { icon: 'check-circle', title: t("auth.transparent.and.safe"), description: t("auth.email.addresses.are.masked.in.the.interface") },
        { icon: 'circle-help', title: t("auth.support.is.always.available"), description: t("auth.you.can.resend.the.email.or.return") },
      ]}
      editorialPrompt={<p>{t("auth.already.verified")} <Link className={formStyles.textLink} to='/login'>{t("auth.go.to.sign.in")}</Link></p>}
      mobileReassuranceTitle={t("auth.protect.your.privacy")}
      mobileReassuranceText={t("auth.the.verification.link.is.valid.for.n24")}
    >
      <div className={flowStyles.authState}>
        {state === 'checking' ? <p className={feedbackStyles.statusMessage} role='status'>{t("auth.checking.verification.link")}</p> : null}
        {state !== 'checking' && state !== 'verified' && email ? (
          <div className={flowStyles.maskedEmail}>
            <span>{t("auth.link.recipient.address")}</span>
            <strong>{maskEmail(email)}</strong>
          </div>
        ) : null}
        {message && state !== 'checking' ? (
          <p className={state === 'verified' ? feedbackStyles.statusMessage : feedbackStyles.errorMessage} role={state === 'verified' ? 'status' : 'alert'}>{t(message)}</p>
        ) : null}
        {state === 'verified' ? (
          <Link className={formStyles.textLink} to='/login'>{t("auth.go.to.sign.in.n2")}</Link>
        ) : (
          <form ref={formRef} className={formStyles.authForm} onSubmit={resend} noValidate>
            <TextInput
              label={t("auth.email.address.for.the.link")}
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              inputMode='email'
              placeholder={t('auth.email.placeholder')}
              hint={t("auth.verification.links.are.valid.for.n24.hours")}
              required
            />
            <Button type='submit' variant='secondary' fullWidth loading={loading}>{t("auth.resend.verification.email")}</Button>
            <Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in.n2")}</Link>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
