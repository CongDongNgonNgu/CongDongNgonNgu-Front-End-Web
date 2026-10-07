import { Button } from "../../../components/ui/Button";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import type { GroupInvite } from "../study-groups.types";
import styles from "./GroupInvitations.module.css";
export function GroupInvitations({
  items,
  busy,
  onIssue,
  onRevoke,
}: {
  items: GroupInvite[];
  busy: boolean;
  onIssue: () => void;
  onRevoke: (id: string) => void;
}) {
  const { t, formatDate } = useUiLocale();
  return (
    <section aria-label={t("groups.invitations")}>
      <Button onClick={onIssue} loading={busy}>
        {t("groups.issue")}
      </Button>
      {items.length === 0 ? <p>{t("groups.noInvites")}</p> : null}
      <ul className={styles.list}>
        {items.map((x) => (
          <li key={x.id}>
            <code>{x.id}</code>
            <span>{t(`groups.${x.state}`)}</span>
            <span>
              {t("groups.expires")}:{" "}
              {formatDate(x.expiresAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {x.state === "UNUSED" ? (
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => onRevoke(x.id)}
              >
                {t("groups.revoke")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
