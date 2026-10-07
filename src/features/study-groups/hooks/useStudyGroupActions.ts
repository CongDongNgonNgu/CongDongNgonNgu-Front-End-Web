import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { canManage, isAccessLost } from "../study-groups.policy";
import type { StudyGroupsApi } from "../study-groups.api";
import type { IssuedInvite } from "../study-groups.types";
import type { PendingGroupAction } from "../components/GroupActionDialog";
import type { useStudyGroup } from "./useStudyGroup";
export function useStudyGroupActions(
  api: StudyGroupsApi,
  groupId: string,
  userId: string,
  authenticated: boolean,
  resource: ReturnType<typeof useStudyGroup>,
) {
  const { t } = useUiLocale();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingGroupAction | null>(null);
  const [issued, setIssued] = useState<IssuedInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const data = resource.data;
  useEffect(() => {
    if (data && !canManage(data.group.role)) setIssued(null);
  }, [data]);
  useEffect(() => {
    setIssued(null);
    setPending(null);
    setMessage("");
  }, [groupId, userId, authenticated]);
  useEffect(() => {
    if (isAccessLost(resource.error)) {
      setIssued(null);
      setPending(null);
      setMessage("");
    }
  }, [resource.error]);
  async function run(
    operation: () => Promise<unknown>,
    successMessage = t("groups.success"),
  ) {
    if (busy) return false;
    setBusy(true);
    const result = await resource.perform(operation);
    setBusy(false);
    if (result === undefined) return false;
    setPending(null);
    setMessage(successMessage);
    await resource.refresh();
    return true;
  }
  async function issue() {
    if (busy) return;
    setBusy(true);
    const result = await resource.perform(() => api.issue(groupId));
    setBusy(false);
    if (result) {
      setIssued(result);
      await resource.refresh();
    }
  }
  async function confirm(reason: string) {
    if (!pending || busy) return;
    const { action, id = "" } = pending;
    let operation: () => Promise<unknown>;
    switch (action) {
      case "remove":
        operation = () => api.remove(groupId, id);
        break;
      case "promote":
        operation = () => api.role(groupId, id, "MODERATOR");
        break;
      case "demote":
        operation = () => api.role(groupId, id, "MEMBER");
        break;
      case "transfer":
        operation = () => api.transfer(groupId, id);
        break;
      case "leave":
        operation = () => api.leave(groupId);
        break;
      case "archive":
        operation = () => api.archive(groupId);
        break;
      case "hide":
        operation = () => api.hide(groupId, id);
        break;
      case "report":
        operation = () => api.report(groupId, id, reason);
        break;
      case "revoke":
        operation = () => api.revoke(groupId, id);
        break;
      case "resolve":
        operation = () => api.resolve(groupId, id);
        break;
    }
    if (action === "leave" || action === "archive") {
      setBusy(true);
      const result = await resource.perform(operation);
      setBusy(false);
      if (result !== undefined) {
        setIssued(null);
        setPending(null);
        resource.clear();
        navigate("/community/groups", { replace: true });
      }
      return;
    }
    await run(
      operation,
      action === "report" ? t("groups.reportAck") : t("groups.success"),
    );
  }

  return {
    pending,
    setPending,
    issued,
    setIssued,
    busy,
    message,
    run,
    issue,
    confirm,
  };
}
