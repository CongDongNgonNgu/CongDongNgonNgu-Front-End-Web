import { Button } from "../../../components/ui/Button";
import { Avatar } from "../../../components/ui/Surface";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { canRemove, canManage } from "../study-groups.policy";
import type { GroupRole, GroupMember } from "../study-groups.types";
import styles from "./GroupMembers.module.css";
export type MemberAction = "remove" | "promote" | "demote" | "transfer";
export function GroupMembers({
  role, userId, members, busy, onAction,
}: {
  role: GroupRole;
  userId: string;
  members: GroupMember[];
  busy: boolean;
  onAction: (action: MemberAction, target: string) => void;
}) {
  const { t, formatDate } = useUiLocale();
  return <section aria-label={t("groups.members")}>
    <h2 className={styles.title}>{t("groups.members")}</h2>
    <p className={styles.help}>{t("groups.memberRolesHelp")}</p>
    <ul className={styles.members}>
      {members.map(member => <li key={member.userId}>
        <div className={styles.identity}>
          <span aria-hidden="true"><Avatar name={member.displayName} size="sm"/></span>
          <div className={styles.details}>
            <div className={styles.name}><strong>{member.displayName}</strong>{member.userId === userId ? <span className={styles.you}>{t("groups.you")}</span> : null}</div>
            <span className={styles.role}>{t(`groups.${member.role}`)}</span>
            {member.joinedAt ? <time dateTime={member.joinedAt}>{t("groups.joined", { date: formatDate(member.joinedAt, { dateStyle: "medium" }) })}</time> : null}
          </div>
        </div>
        <div className={styles.actions}>
          {canRemove(role, member.role, member.userId === userId) ? <Button variant="danger" disabled={busy} onClick={() => onAction("remove", member.userId)}>{t("groups.remove")}</Button> : null}
          {canManage(role) && member.role !== "OWNER" ? <>
            <Button variant="secondary" disabled={busy} onClick={() => onAction(member.role === "MEMBER" ? "promote" : "demote", member.userId)}>{t(member.role === "MEMBER" ? "groups.promote" : "groups.demote")}</Button>
            <Button variant="quiet" disabled={busy} onClick={() => onAction("transfer", member.userId)}>{t("groups.transfer")}</Button>
          </> : null}
        </div>
      </li>)}
    </ul>
  </section>;
}
