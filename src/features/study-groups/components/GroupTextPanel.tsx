import { useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/Button";
import { Textarea } from "../../../components/ui/FormControls";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { canModerate } from "../study-groups.policy";
import type { GroupRole, GroupText } from "../study-groups.types";
import styles from "./GroupTextPanel.module.css";
export function GroupTextPanel({
  role,
  texts,
  busy,
  onWrite,
  onAction,
}: {
  role: GroupRole;
  texts: GroupText[];
  busy: boolean;
  onWrite: (body: string) => Promise<boolean>;
  onAction: (action: "hide" | "report", id: string) => void;
}) {
  const { t, formatDate } = useUiLocale();
  const [body, setBody] = useState("");
  const [invalid, setInvalid] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!body.trim() || body.trim().length > 2000) {
      setInvalid(true);
      e.currentTarget.querySelector("textarea")?.focus();
      return;
    }
    setInvalid(false);
    if (await onWrite(body.trim())) setBody("");
  }
  const visible = texts.filter((x) => !x.hidden || canModerate(role));
  return (
    <section aria-label={t("groups.discussion")} className={styles.panel}>
      <form onSubmit={(e) => void submit(e)}>
        <Textarea
          label={t("groups.body")}
          hint={t("groups.textBound")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
          disabled={busy}
          error={invalid ? t("groups.validation") : undefined}
        />
        <Button type="submit" loading={busy}>
          {t("groups.post")}
        </Button>
      </form>
      {visible.length === 0 ? <p>{t("groups.noTexts")}</p> : null}
      <div className={styles.texts}>
        {visible.map((x) => (
          <article key={x.id}>
            <header>
              <strong>{x.author.displayName}</strong>
              <time dateTime={x.createdAt}>{formatDate(x.createdAt)}</time>
            </header>
            {x.hidden ? <p>{t("groups.hidden")}</p> : null}
            <p className={styles.body}>{x.body}</p>
            <div className={styles.actions}>
              {!x.hidden ? (
                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={() => onAction("report", x.id)}
                >
                  {t("groups.report")}
                </Button>
              ) : null}
              {canModerate(role) && !x.hidden ? (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => onAction("hide", x.id)}
                >
                  {t("groups.hide")}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
