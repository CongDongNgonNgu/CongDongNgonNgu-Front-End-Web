import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon/Icon";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import type { GroupInvite } from "../study-groups.types";
import styles from "./GroupInvitations.module.css";
export function GroupInvitations({ items, busy, onIssue, onRevoke }: {
  items: GroupInvite[]; busy: boolean; onIssue: () => void; onRevoke: (id: string) => void;
}) {
  const { t, formatDate } = useUiLocale();
  return <section aria-label={t("groups.invitations")}>
    <div className={styles.heading}>
      <h2>{t("groups.invitationHistory")}</h2>
      <Button onClick={onIssue} loading={busy}><Icon name="user-plus" size={18}/>{t("groups.issue")}</Button>
    </div>
    <p className={styles.help}>{t("groups.invitationHistoryHelp")}</p>
    {items.length === 0 ? <p className={styles.empty}>{t("groups.noInvites")}</p> : null}
    <ul className={styles.list}>
      {items.map(invite => <li key={invite.id}>
        <div className={styles.state}><Icon name="lock" size={16}/><strong>{t(`groups.${invite.state}`)}</strong></div>
        <p>{t("groups.expires")}: <time dateTime={invite.expiresAt}>{formatDate(invite.expiresAt, { dateStyle: "medium", timeStyle: "short" })}</time></p>
        <div className={styles.identifier}><span>{t("groups.invitationId")}</span><code>{invite.id}</code></div>
        {invite.state === "UNUSED" ? <Button variant="danger" disabled={busy} onClick={() => onRevoke(invite.id)}>{t("groups.revoke")}</Button> : null}
      </li>)}
    </ul>
  </section>;
}
