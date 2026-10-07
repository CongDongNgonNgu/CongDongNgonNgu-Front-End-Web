import { Button } from "../../../components/ui/Button";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { canRemove, canManage } from "../study-groups.policy";
import type { GroupRole, GroupMember } from "../study-groups.types";
import styles from "./GroupMembers.module.css";
export type MemberAction = "remove" | "promote" | "demote" | "transfer";
export function GroupMembers({
  role,
  userId,
  members,
  busy,
  onAction,
}: {
  role: GroupRole;
  userId: string;
  members: GroupMember[];
  busy: boolean;
  onAction: (action: MemberAction, target: string) => void;
}) {
  const { t } = useUiLocale();
  return (
    <ul className={styles.members}>
      {members.map((m) => (
        <li key={m.userId}>
          <div>
            <strong>{m.displayName}</strong>
            <span>{t(`groups.${m.role}`)}</span>
          </div>
          <div className={styles.actions}>
            {canRemove(role, m.role, m.userId === userId) ? (
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => onAction("remove", m.userId)}
              >
                {t("groups.remove")}
              </Button>
            ) : null}
            {canManage(role) && m.role !== "OWNER" ? (
              <>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    onAction(
                      m.role === "MEMBER" ? "promote" : "demote",
                      m.userId,
                    )
                  }
                >
                  {t(m.role === "MEMBER" ? "groups.promote" : "groups.demote")}
                </Button>
                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={() => onAction("transfer", m.userId)}
                >
                  {t("groups.transfer")}
                </Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
