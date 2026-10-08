import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/FormControls/TextInput';
import { authErrorKey } from '../auth-errors';
import { AuthBody } from '../AuthBody';
import { PasswordField } from '../PasswordField';
import { ProviderButtons } from '../ProviderButtons';
import { useAuth } from '../AuthProvider';
import formStyles from '../AuthForm.module.css';
import feedbackStyles from '../AuthFeedback.module.css';

export function LoginPage() {
  const { t } = useUiLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<TranslationKey | ''>('');
  const [fieldError, setFieldError] = useState<TranslationKey | ''>('');
  const [invalidField, setInvalidField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const locationState = location.state as { from?: unknown } | null;
  const returnPath = typeof locationState?.from === 'string'
    && locationState.from.startsWith('/')
    && !locationState.from.startsWith('//')
    ? locationState.from
    : '/';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!email.includes('@') || !email.includes('.')) {
      setFieldError("auth.please.enter.a.valid.email.address");
      setInvalidField('email');
      formRef.current?.querySelector<HTMLInputElement>('input[type=email]')?.focus();
      return;
    }
    if (!password) {
      setFieldError("auth.please.enter.your.password");
      setInvalidField('password');
      formRef.current?.querySelector<HTMLInputElement>('[autocomplete=current-password]')?.focus();
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate(returnPath, { replace: true });
    } catch (reason) {
      setError(authErrorKey(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      variant='login'
      eyebrow={t("auth.welcome.back")}
      title={t("auth.sign.in")}
      description={t("auth.enter.your.account.details.to.access.your")}
      editorialEyebrow={t("auth.welcome.back")}
      editorialTitle={t("auth.continue.your.journey.of.language.connections")}
      editorialDescription={t("auth.sign.in.to.exchange.knowledge.practise.real")}
      editorialItems={[
        { icon: 'users', title: t("auth.learn.with.real.people"), description: t("auth.a.safe.space.to.ask.questions.and") },
        { icon: 'book-open', title: t("auth.open.resources.for.the.community"), description: t("auth.vocabulary.contexts.and.dialogue.contributions.are.stored") },
        { icon: 'users', title: t("auth.respect.and.empathy"), description: t("auth.every.language.has.its.own.rhythm.connections") },
      ]}
      editorialPrompt={<p>{t("auth.no.account.yet")} <Link className={formStyles.textLink} to='/register'>{t("auth.join.for.free.create.a.new.account")}</Link></p>}
    >
      <form ref={formRef} className={formStyles.authForm} onSubmit={submit} noValidate aria-describedby={error ? 'login-error' : undefined}>
        {error ? <p className={feedbackStyles.errorMessage} id='login-error' role='alert'>{t(error)}</p> : null}
        <TextInput
          label={t("auth.email.address")}
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete='email'
          inputMode='email'
          placeholder={t('auth.login.emailPlaceholder')}
          hint={t("auth.your.registered.email.at.congdongngonnguvn")}
          required
          error={fieldError && invalidField === 'email' ? t(fieldError) : undefined}
        />
        <PasswordField
          label={t("auth.password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete='current-password'
          required
          error={fieldError && invalidField === 'password' ? t(fieldError) : undefined}
        />
        <div className={formStyles.passwordLinks}>
          <Link className={formStyles.textLink} to='/forgot-password'>{t("auth.forgot.password")}</Link>
        </div>
        <label className={formStyles.authConsent}>
          <input type='checkbox' checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span>{t("auth.remember.signin.on.this.device")}</span>
        </label>
        <div className={formStyles.formActions}>
          <Button type='submit' variant='secondary' fullWidth loading={loading}>{t("auth.sign.in.to.your.account")}</Button>
          <ProviderButtons />
        </div>
        <div className={formStyles.authLinks}>
          <span>{t("auth.new.member")}</span>
          <Link className={formStyles.textLink} to='/register'>{t("auth.create.a.free.account")}</Link>
        </div>
        <p className={formStyles.legalNote}>{t("auth.by.signing.in.you.agree.to.the")} <span className={formStyles.textLink} aria-disabled='true'>{t("auth.community.guidelines")}</span> {" "}{t("auth.and")} <span className={formStyles.textLink} aria-disabled='true'>{t("auth.privacy.policy")}</span> {" "}{t("auth.of.congdongngonnguvn")}</p>
      </form>
    </AuthBody>
  );
}
