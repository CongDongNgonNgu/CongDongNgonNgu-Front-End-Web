import { useState, type FormEvent } from "react";
import { Dialog } from "../../../components/ui/Overlays";
import { Button } from "../../../components/ui/Button";
import { Textarea } from "../../../components/ui/FormControls";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import type { TranslationKey } from "../../ui-locale/ui-locale";
export type GroupAction =
  | "remove"
  | "promote"
  | "demote"
  | "transfer"
  | "leave"
  | "archive"
  | "hide"
  | "report"
  | "revoke"
  | "resolve";
export interface PendingGroupAction {
  action: GroupAction;
  id?: string;
}
const labels: Record<GroupAction, TranslationKey> = {
  remove: "groups.remove",
  promote: "groups.promote",
  demote: "groups.demote",
  transfer: "groups.transfer",
  leave: "groups.leave",
  archive: "groups.archive",
  hide: "groups.hide",
  report: "groups.report",
  revoke: "groups.revoke",
  resolve: "groups.resolve",
};
const help: Partial<Record<GroupAction, TranslationKey>> = {
  remove: "groups.removeHelp",
  promote: "groups.roleHelp",
  demote: "groups.roleHelp",
  transfer: "groups.transferHelp",
  leave: "groups.leaveHelp",
  archive: "groups.archiveHelp",
  hide: "groups.hideHelp",
  revoke: "groups.revokeHelp",
};
export function GroupActionDialog({
  pending,
  busy,
  onClose,
  onConfirm,
  targetName,
  groupName,
}: {
  groupName?: string;
  targetName?: string;
  pending: PendingGroupAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const { t } = useUiLocale();
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (
      pending.action === "report" &&
      (!reason.trim() || reason.trim().length > 500)
    ) {
      setInvalid(true);
      e.currentTarget.querySelector("textarea")?.focus();
      return;
    }
    await onConfirm(reason.trim());
  }
  return (
    <Dialog
      open
      title={t(labels[pending.action])}
      closeLabel={t("groups.close")}
      description={help[pending.action] ? t(help[pending.action]!) : undefined}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={(e) => void submit(e)}>
        {targetName ? (
          <p>
            <strong>{t("groups.targetMember", { name: targetName })}</strong>
          </p>
        ) : null}
        {pending.action === "archive" && groupName ? (
          <p>
            <strong>{t("groups.targetGroup", { name: groupName })}</strong>
          </p>
        ) : null}
        {pending.action === "report" ? (
          <Textarea
            label={t("groups.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={500}
            hint={t("groups.reasonBound")}
            error={invalid ? t("groups.validation") : undefined}
            disabled={busy}
          />
        ) : null}
        <Button
          type="submit"
          loading={busy}
          variant={
            ["remove", "archive", "leave", "hide", "revoke"].includes(
              pending.action,
            )
              ? "danger"
              : "primary"
          }
        >
          {t("groups.confirm")}
        </Button>{" "}
        <Button variant="quiet" disabled={busy} onClick={onClose}>
          {t("groups.cancel")}
        </Button>
      </form>
    </Dialog>
  );
}
