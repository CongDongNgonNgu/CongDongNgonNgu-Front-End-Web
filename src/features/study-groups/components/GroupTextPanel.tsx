import { useMemo, useRef, useState, type FormEvent } from "react";
import { Avatar } from "../../../components/ui/Surface";
import { Button } from "../../../components/ui/Button";
import { Textarea, TextInput } from "../../../components/ui/FormControls";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { MessageContextCard } from "../../communication/components/MessageContextCard";
import type { MessageContextRefresh } from "../../communication/message-context-refresh";
import { parseLearningReference } from "../../communication/learning-reference";
import { useResponseTextarea } from "../../community/hooks/useResponseTextarea";
import { GroupSendAttempt } from "../group-send-attempt";
import { canModerate } from "../study-groups.policy";
import type {
  GroupRole,
  GroupText,
  GroupWriteInput,
} from "../study-groups.types";
import styles from "./GroupTextPanel.module.css";
export function GroupTextPanel({
  role,
  texts,
  busy,
  onWrite,
  onAction,
  contextQueue,
}: {
  role: GroupRole;
  texts: GroupText[];
  busy: boolean;
  onWrite: (input: GroupWriteInput) => Promise<boolean>;
  onAction: (action: "hide" | "report", id: string) => void;
  contextQueue?: MessageContextRefresh | null;
}) {
  const { t, formatDate } = useUiLocale();
  const [body, setBody] = useState(""),
    [link, setLink] = useState(""),
    [shareOpen, setShareOpen] = useState(false);
  const [invalid, setInvalid] = useState<"body" | "link" | null>(null),
    [sending, setSending] = useState(false),
    [failed, setFailed] = useState(false);
  const attempt = useMemo(() => new GroupSendAttempt(), []),
    bodyRef = useResponseTextarea(body),
    sendingRef = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || sendingRef.current) return;
    const text = body.trim(),
      reference = link.trim() ? parseLearningReference(link) : null;
    if (link.trim() && !reference) {
      setInvalid("link");
      setShareOpen(true);
      return;
    }
    if ((!text && !reference) || Array.from(text).length > 2000) {
      setInvalid("body");
      bodyRef.current?.focus();
      return;
    }
    setInvalid(null);
    sendingRef.current = true;
    setSending(true);
    const input = attempt.input({
      ...(text ? { body: text } : {}),
      ...(reference
        ? { contextType: reference.type, contextId: reference.id }
        : {}),
    });
    try {
      if (await onWrite(input)) {
        attempt.clear();
        setBody("");
        setLink("");
        setShareOpen(false);
        setFailed(false);
      } else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }
  const disabled = busy || sending;
  const visible = texts.filter((x) => !x.hidden || canModerate(role));
  return (
    <section aria-label={t("groups.discussion")} className={styles.panel}>

      {visible.length === 0 ? <div className={styles.empty}><h3>{t("groups.noTexts")}</h3><p>{t("groups.discussionEmptyHelp")}</p></div> : null}
      <div
        className={styles.texts}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {visible.map((text) => (
          <article key={text.id}>
            <header>
              <div className={styles.identity}><span aria-hidden="true"><Avatar name={text.author.displayName} size="sm"/></span><strong>{text.author.displayName}</strong></div>
              <time dateTime={text.createdAt}>
                {formatDate(text.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </header>
            {text.hidden ? <p>{t("groups.hidden")}</p> : null}
            <p className={styles.body}>{text.body}</p>
            {text.context ? (
              <MessageContextCard
                queue={contextQueue ?? null}
                messageId={text.id}
              />
            ) : null}
            <div className={styles.actions}>
              {!text.hidden ? (
                <Button
                  variant="quiet"
                  disabled={disabled}
                  onClick={() => onAction("report", text.id)}
                >
                  {t("groups.report")}
                </Button>
              ) : null}
              {canModerate(role) && !text.hidden ? (
                <Button
                  variant="danger"
                  disabled={disabled}
                  onClick={() => onAction("hide", text.id)}
                >
                  {t("groups.hide")}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <Textarea
          ref={bodyRef}
          className={styles.editor}
          rows={3}
          label={t(shareOpen ? "groups.collaboration.note" : "groups.body")}
          hint={t("groups.collaboration.counter", {
            count: Array.from(body).length,
          })}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            attempt.clear();
            setInvalid(null);
            setFailed(false);
          }}
          disabled={disabled}
          error={
            invalid === "body" ? t("groups.collaboration.invalid") : undefined
          }
        />
        <Button
          variant="quiet"
          aria-expanded={shareOpen}
          aria-controls="group-share-reference"
          disabled={disabled}
          onClick={() => setShareOpen((value) => !value)}
        >
          {t("groups.collaboration.reference")}
        </Button>
        {shareOpen ? (
          <div id="group-share-reference">
            <TextInput
              label={t("groups.collaboration.link")}
              hint={t("groups.collaboration.linkHint")}
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                attempt.clear();
                setInvalid(null);
                setFailed(false);
              }}
              disabled={disabled}
              error={
                invalid === "link"
                  ? t("groups.collaboration.linkInvalid")
                  : undefined
              }
            />
          </div>
        ) : null}
        <Button type="submit" loading={sending} disabled={busy}>
          {t(failed ? "groups.collaboration.retry" : "groups.post")}
        </Button>
      </form>
    </section>
  );
}
