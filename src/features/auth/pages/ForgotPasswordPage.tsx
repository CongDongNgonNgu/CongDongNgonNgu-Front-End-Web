import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorKey } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { useAuth } from '../AuthProvider';
import { RecoveryStatusRail } from '../RecoveryStatusRail';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';
import flowStyles from '../AuthFlow.module.css';

export function ForgotPasswordPage() {
  const { t } = useUiLocale();
  const { api } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<TranslationKey | ''>('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!email.includes('@') || !email.includes('.')) {
      setError("auth.please.enter.a.valid.email.address");
      formRef.current?.querySelector<HTMLInputElement>('input[type=email]')?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (reason) {
      setError(authErrorKey(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow={t("auth.account.security")}
      title={t("auth.password.recovery")}
      description={t("auth.enter.the.email.address.linked.to.your")}
      editorialEyebrow={t("auth.account.security")}
      editorialTitle={t("auth.protect.your.account.and.learning.journey")}
      editorialDescription={t("auth.account.recovery.uses.multiple.layers.of.security")}
      editorialItems={[
        { icon: 'lock', title: t("auth.recovery.without.disclosing.identity"), description: t("auth.we.keep.your.email.and.learning.information") },
        { icon: 'check-circle', title: t("auth.timelimited.links"), description: t("auth.recovery.links.expire.shortly.and.can.only") },
        { icon: 'circle-help', title: t("auth.friendly.support"), description: t("auth.if.you.do.not.receive.the.email") },
      ]}
      editorialPrompt={<p>{t("auth.remember.your.password")} <Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in")}</Link></p>}
      recoveryRail={<RecoveryStatusRail activeStep={sent ? 2 : 1} />}
      mobileReassuranceTitle={t("auth.protect.your.privacy")}
      mobileReassuranceText={t("auth.congdongngonnguvn.never.asks.for.your.password.by")}
    >
      <div className={flowStyles.authState}>
        {sent ? (
          <>
            <span className={flowStyles.flowIcon} aria-hidden='true'>✓</span>
            <h3 className={flowStyles.flowStateTitle}>{t("auth.check.your.inbox")}</h3>
            <p className={feedbackStyles.statusMessage} role='status'>{t("auth.if.this.email.address.exists.in.the")}</p>
            <div className={flowStyles.flowNotice}>
              <strong>{t("auth.no.email.yet")}</strong>
              <span>{t("auth.please.check.spam.promotions.and.automated.filters")}</span>
            </div>
            <Button type='button' variant='quiet' fullWidth disabled>{t("auth.resend.link.now")}</Button>
            <Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in.n2")}</Link>
          </>
        ) : (
          <form ref={formRef} className={formStyles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'forgot-error' : undefined}>
            {error ? <p className={feedbackStyles.errorMessage} id='forgot-error' role='alert'>{t(error)}</p> : null}
            <TextInput
              label={t("auth.linked.email.address")}
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              inputMode='email'
              placeholder={t('auth.email.placeholder')}
              hint={t("auth.we.will.send.a.secure.link.valid")}
              required
            />
            <div className={formStyles.formActions}>
              <Button type='submit' variant='secondary' fullWidth loading={loading}>{t("auth.send.recovery.link")}</Button>
              <Link className={formStyles.textLink} to='/login'>{t("auth.i.remember.my.password")}</Link>
            </div>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
