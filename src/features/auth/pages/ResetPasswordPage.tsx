import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { authErrorKey } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { PasswordField } from '../PasswordField';
import { useAuth } from '../AuthProvider';
import { RecoveryStatusRail } from '../RecoveryStatusRail';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';
import flowStyles from '../AuthFlow.module.css';

export function ResetPasswordPage() {
  const { t } = useUiLocale();
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [complete, setComplete] = useState(searchParams.get('complete') === '1');
  const [error, setError] = useState<TranslationKey | ''>(token ? '' : "auth.the.password.reset.link.is.invalid.or");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError('');
    if (password.length < 12) {
      setError("auth.your.password.must.contain.at.least.n12");
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    if (password !== confirmation) {
      setError("auth.the.passwords.do.not.match");
      formRef.current?.querySelectorAll<HTMLInputElement>('input')[1]?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setComplete(true);
    } catch (reason) {
      setError(authErrorKey(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      eyebrow={complete ? t("auth.recovery.complete") : token ? t("auth.create.a.new.password") : t("auth.recovery.link")}
      title={complete ? t("auth.password.reset.successful") : token ? t("auth.create.a.new.password") : t("auth.the.link.is.expired.or.invalid")}
      description={complete ? t("auth.your.new.password.has.been.saved.securely") : token ? t("auth.your.new.password.must.meet.security.requirements") : t("auth.for.security.a.recovery.link.can.only")}
      editorialEyebrow={t("auth.account.security")}
      editorialTitle={t("auth.protect.what.you.have.learned")}
      editorialDescription={t("auth.every.recovery.step.is.designed.to.protect")}
      editorialItems={[
        { icon: 'lock', title: t("auth.singleuse.link"), description: t("auth.recovery.links.expire.and.cannot.be.reused") },
        { icon: 'check-circle', title: t("auth.strong.memorable.password"), description: t("auth.choose.a.long.private.phrase.that.is") },
        { icon: 'circle-help', title: t("auth.support.is.always.available"), description: t("auth.you.can.return.to.sign.in.or") },
      ]}
      editorialPrompt={<p>{t("auth.remembered.your.password")} <Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in")}</Link></p>}
      recoveryRail={<RecoveryStatusRail activeStep={complete ? 5 : token ? 3 : 4} />}
      mobileReassuranceTitle={t("auth.protect.your.privacy")}
      mobileReassuranceText={t("auth.congdongngonnguvn.never.asks.for.your.password.by")}
    >
      <div className={flowStyles.authState}>
        {complete ? (
          <>
            <span className={flowStyles.flowIcon} aria-hidden='true'>✓</span>
            <h3 className={flowStyles.flowStateTitle}>{t("auth.your.password.was.updated.successfully")}</h3>
            <p className={feedbackStyles.statusMessage} role='status'>{t("auth.sessions.on.unfamiliar.devices.have.been.signed")}</p>
            <Link className={formStyles.textLink} to='/login'>{t("auth.sign.in.with.your.new.password")}</Link>
          </>
        ) : !token ? (
          <>
            <div className={flowStyles.flowErrorCard} role='alert'>
              <strong>{t("auth.the.link.is.expired.or.invalid")}</strong>
              <span>{t("auth.please.send.a.new.recovery.request.to")}</span>
            </div>
            <Link className={flowStyles.flowButton} to='/forgot-password'>{t("auth.request.a.new.link")}</Link>
            <Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in.n2")}</Link>
          </>
        ) : (
          <form ref={formRef} className={formStyles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'reset-error' : undefined}>
            {error ? <p className={feedbackStyles.errorMessage} id='reset-error' role='alert'>{t(error)}</p> : null}
            <PasswordField
              label={t("auth.new.password")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='new-password'
              placeholder={t("auth.enter.a.new.password")}
              hint={<span className={formStyles.passwordHintCard}><strong>{t("auth.memorable.and.secure.password.standards")}</strong><span>{t('auth.reset.minimumHint')}</span><span>{t("auth.consider.combining.letters.and.numbers.to.better")}</span></span>}
              required
            />
            <PasswordField label={t("auth.confirm.new.password")} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete='new-password' placeholder={t("auth.reenter.the.new.password")} required />
            <Button type='submit' variant='secondary' fullWidth loading={loading}>{t("auth.save.new.password.and.continue")}</Button>
            <Link className={formStyles.textLink} to='/login'>{t("auth.back.to.sign.in.n2")}</Link>
          </form>
        )}
      </div>
    </AuthBody>
  );
}
