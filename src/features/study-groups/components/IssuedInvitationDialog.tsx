import { useState } from "react";
import { Dialog } from "../../../components/ui/Overlays";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/FormControls";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import type { IssuedInvite } from "../study-groups.types";
import styles from "./IssuedInvitationDialog.module.css";
export function IssuedInvitationDialog({
  invite,
  groupId,
  onClose,
}: {
  invite: IssuedInvite;
  groupId: string;
  onClose: () => void;
}) {
  const { t, formatDate } = useUiLocale();
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  async function copy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(invite.token);
      setMessage(t("groups.copied"));
    } catch {
      setMessage(t("groups.copyFailed"));
    } finally {
      setCopying(false);
    }
  }
  return (
    <Dialog
      open
      title={t("groups.issue")}
      closeLabel={t("groups.close")}
      description={t("groups.rawHelp")}
      onClose={onClose}
    >
      <div className={styles.content}>
        <TextInput label={t("groups.groupId")} value={groupId} readOnly />
        <TextInput
          label={t("groups.token")}
          value={invite.token}
          readOnly
          autoComplete="off"
        />
        <p>
          {t("groups.expires")}:{" "}
          {formatDate(invite.expiresAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <Button onClick={() => void copy()} loading={copying}>
          {t("groups.copy")}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t("groups.close")}
        </Button>
        <p role="status">{message}</p>
      </div>
    </Dialog>
  );
}
