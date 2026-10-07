import { useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/Button";
import { TextInput, Textarea } from "../../../components/ui/FormControls";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import styles from "./GroupEntryForm.module.css";
export function GroupEntryForm({
  mode,
  busy,
  onSubmit,
}: {
  mode: "create" | "accept";
  busy: boolean;
  onSubmit: (first: string, second: string) => Promise<boolean>;
}) {
  const { t } = useUiLocale();
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [invalid, setInvalid] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const valid =
      first.trim().length > 0 &&
      (mode === "create"
        ? first.trim().length <= 120 && second.trim().length <= 500
        : second.trim().length > 0);
    setInvalid(!valid);
    if (!valid) {
      e.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    const secret = second.trim();
    if (mode === "accept") setSecond("");
    if (await onSubmit(first.trim(), secret)) {
      setFirst("");
      setSecond("");
    }
  }
  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <TextInput
        label={t(mode === "create" ? "groups.name" : "groups.groupId")}
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        required
        maxLength={mode === "create" ? 120 : 36}
        hint={mode === "create" ? t("groups.nameBound") : undefined}
        error={invalid ? t("groups.validation") : undefined}
        disabled={busy}
      />
      {mode === "create" ? (
        <Textarea
          label={t("groups.description")}
          value={second}
          onChange={(e) => setSecond(e.target.value)}
          maxLength={500}
          hint={t("groups.descriptionBound")}
          disabled={busy}
        />
      ) : (
        <TextInput
          label={t("groups.token")}
          type="password"
          value={second}
          onChange={(e) => setSecond(e.target.value)}
          autoComplete="off"
          required
          maxLength={128}
          disabled={busy}
        />
      )}
      {mode === "accept" ? <p>{t("groups.inviteHelp")}</p> : null}
      <Button type="submit" loading={busy}>
        {t(mode === "create" ? "groups.create" : "groups.join")}
      </Button>
    </form>
  );
}
