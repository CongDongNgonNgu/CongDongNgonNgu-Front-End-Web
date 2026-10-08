import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon/Icon";
import { TextInput } from "../../../components/ui/FormControls/TextInput";
import { authErrorKey } from "../auth-errors";
import { AuthBody } from "../AuthBody";
import { PasswordField } from "../PasswordField";
import { ProviderButtons } from "../ProviderButtons";
import { useAuth } from "../AuthProvider";
import formStyles from "../AuthForm.module.css";
import feedbackStyles from "../AuthFeedback.module.css";

export function RegisterPage() {
  const { t } = useUiLocale();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<TranslationKey | ''>("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function focusInput(index: number): void {
    formRef.current?.querySelectorAll<HTMLInputElement>("input")[index]?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (displayName.trim().length < 2) {
      setError("auth.your.display.name.must.contain.at.least");
      focusInput(0);
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("auth.please.enter.a.valid.email.address");
      focusInput(1);
      return;
    }
    if (password.length < 8) {
      setError("auth.your.password.must.contain.at.least.n8");
      focusInput(2);
      return;
    }
    if (password !== confirmation) {
      setError("auth.the.passwords.do.not.match");
      focusInput(3);
      return;
    }
    if (!consent) {
      setError("auth.please.read.and.agree.to.the.community");
      formRef.current?.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.register({ displayName: displayName.trim(), email: email.trim().toLowerCase(), password });
      navigate("/verify-email?email=" + encodeURIComponent(email.trim().toLowerCase()), { replace: true });
    } catch (reason) {
      setError(authErrorKey(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody
      variant="register"
      eyebrow={t("auth.join.us")}
      title={t("auth.create.an.account")}
      description={t("auth.join.our.open.community.of.language.learners")}
      editorialEyebrow={t("auth.join.us")}
      editorialTitle={t("auth.learn.preserve.and.share.languages.together")}
      editorialDescription={t("auth.create.a.free.account.to.exchange.knowledge")}
      editorialItems={[
        { icon: "users", title: t("auth.meaningful.learning.with.people"), description: t("auth.an.open.space.connecting.learners.and.experienced") },
        { icon: "book-open", title: t("auth.contribute.shared.knowledge"), description: t("auth.vocabulary.examples.and.correction.notes.are.developed") },
        { icon: "check-circle", title: t("auth.respect.and.equality"), description: t("auth.we.are.committed.to.a.safe.understanding") },
      ]}
      editorialPrompt={<p>{t("auth.already.have.an.account")}{" "}<Link className={formStyles.textLink} to="/login">{t("auth.sign.in.now")}</Link></p>}
      mobileReassuranceTitle={t("auth.respect.and.privacy")}
      mobileReassuranceText={t("auth.we.never.sell.your.data.or.send")}
    >
      <form ref={formRef} className={formStyles.authForm} onSubmit={submit} noValidate aria-describedby={error ? "register-error" : undefined}>
        {error ? <p className={feedbackStyles.errorMessage} id="register-error" role="alert">{t(error)}</p> : null}
        <div className={feedbackStyles.authInfo} role="status" aria-live="polite">
          <Icon name="info" size={20} aria-hidden="true" />
          <span className={feedbackStyles.authInfoCopy}>
            <strong>{t("auth.email.verification.notice")}</strong>
            <span>{t("auth.after.you.register.we.will.send.an")}</span>
          </span>
        </div>
        <TextInput label={t("auth.public.display.name")} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder={t("auth.for.example.minh.tuan.or.lan.anh")} hint={t("auth.this.name.appears.when.you.discuss.ask")} required />
        <TextInput label={t("auth.email.address")} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder={t('auth.email.placeholder')} hint={t("auth.used.to.sign.in.protect.your.account")} required />
        <PasswordField
          label={t("auth.password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder={t("auth.at.least.n8.characters")}
          hint={<span className={formStyles.passwordHintCard}><strong>{t("auth.memorable.and.secure.password.guidelines")}</strong><span>{t("auth.at.least.n8.characters.n2")}</span><span>{t("auth.consider.combining.letters.and.numbers.to.better")}</span></span>}
          required
        />
        <PasswordField label={t("auth.confirm.password")} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder={t("auth.reenter.the.password.above")} required />
        <label className={formStyles.authConsent}>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
          <span>{t("auth.i.have.read.and.agree.to.the")} <span className={formStyles.textLink} aria-disabled='true'>{t("auth.community.guidelines")}</span> {" "}{t("auth.and")} <span className={formStyles.textLink} aria-disabled='true'>{t("auth.privacy.policy")}</span> {" "}{t("auth.of.congdongngonnguvn")}</span>
        </label>
        <div className={formStyles.formActions}>
          <Button type="submit" variant="secondary" fullWidth loading={loading}>{t("auth.create.member.account")}</Button>
          <ProviderButtons />
        </div>
        <div className={formStyles.authLinks}>
          <span>{t("auth.already.a.member")}</span>
          <Link className={formStyles.textLink} to="/login">{t("auth.sign.in.now.n2")}</Link>
        </div>
      </form>
    </AuthBody>
  );
}
