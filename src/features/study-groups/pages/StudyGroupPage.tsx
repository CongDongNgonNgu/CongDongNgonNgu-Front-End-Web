import { ApiClientError } from "../../../services/api-client";
import { MessageStreamClient } from "../../communication/message-stream.client";
import { useMessageStream } from "../../communication/hooks/use-message-stream";
import { useGroupCollaboration } from "../hooks/useGroupCollaboration";
import { useGroupContexts } from "../hooks/useGroupContexts";
import type { GroupWriteInput } from "../study-groups.types";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { useAuth } from "../../auth/AuthProvider";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { StudyGroupsApi } from "../study-groups.api";
import { ExchangeApi } from "../../exchange/exchange-api";
import type { ConnectionListApi } from "../../exchange/exchange.types";
import { ConnectedPartnerInvitation } from "../components/ConnectedPartnerInvitation";
import { useStudyGroup } from "../hooks/useStudyGroup";
import {
  canManage,
  canModerate,
  groupErrorKey,
  isAccessLost,
} from "../study-groups.policy";
import { StudyGroupHeader } from "../components/StudyGroupHeader";
import { GroupMembers } from "../components/GroupMembers";
import { GroupTextPanel } from "../components/GroupTextPanel";
import { GroupInvitations } from "../components/GroupInvitations";
import { GroupReports } from "../components/GroupReports";
import { GroupActionDialog } from "../components/GroupActionDialog";
import { IssuedInvitationDialog } from "../components/IssuedInvitationDialog";
import { GroupPagination } from "../components/GroupPagination";
import { useStudyGroupActions } from "../hooks/useStudyGroupActions";
import styles from "./StudyGroupPage.module.css";
export function StudyGroupPage() {
  const auth = useAuth();
  const { groupId = "" } = useParams();
  const api = useMemo(() => new StudyGroupsApi(auth.api), [auth.api]);
  const connectionsApi = useMemo(() => new ExchangeApi(auth.api), [auth.api]);
  const streamAuth = useMemo(
    () => ({
      getAccessToken: () => auth.api.getAccessToken(),
      refresh: auth.refresh,
    }),
    [auth.api, auth.refresh],
  );
  return (
    <StudyGroupPageView
      key={auth.user?.id + ":" + groupId}
      api={api}
      streamAuth={streamAuth}
      connectionsApi={connectionsApi}
      groupId={groupId}
      userId={auth.user?.id ?? ""}
      authenticated={auth.status === "authenticated"}
      authLoading={auth.status === "loading"}
    />
  );
}
export function StudyGroupPageView({
  api,
  connectionsApi,
  streamAuth,
  groupId,
  userId,
  authenticated,
  authLoading = false,
}: {
  api: StudyGroupsApi;
  connectionsApi?: Pick<ConnectionListApi, "listConnections">;
  streamAuth?: {
    getAccessToken: () => string | null;
    refresh: () => Promise<{ id: string }>;
  };
  groupId: string;
  userId: string;
  authenticated: boolean;
  authLoading?: boolean;
}) {
  const { t } = useUiLocale();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<
    "discussion" | "members" | "invitations" | "reports"
  >("discussion");
  const resource = useStudyGroup(api, groupId, userId, authenticated, page);
  const contextQueueRef = useRef<ReturnType<typeof useGroupContexts>>(null);
  const deny = useCallback(
    (error: unknown) => {
      if (isAccessLost(error)) {
        contextQueueRef.current?.dispose();
        resource.clear(error);
      }
    },
    [resource.clear],
  );
  const collaboration = useGroupCollaboration({
    api,
    groupId,
    actor: userId,
    enabled: authenticated && Boolean(resource.data),
    onAccessLost: deny,
    onBeforeReconcile: () => contextQueueRef.current?.invalidate(),
  });
  const contextDenied = useCallback(
    (error: unknown) => {
      // A hidden text and a lost group intentionally share the same safe 404.
      // Authoritative sync distinguishes them before discarding an active draft.
      if (
        error instanceof ApiClientError &&
        error.status === 404 &&
        error.code === "GROUP_UNAVAILABLE"
      ) {
        void collaboration.reconcile();
        return;
      }
      deny(error);
    },
    [collaboration.reconcile, deny],
  );
  const contextQueue = useGroupContexts(
    api,
    groupId,
    userId + ":" + collaboration.epoch,
    authenticated && Boolean(resource.data) && !collaboration.accessLost,
    contextDenied,
  );
  contextQueueRef.current = contextQueue;
  const streamClient = useMemo(
    () => new MessageStreamClient(undefined, undefined, "/study-groups/"),
    [collaboration.epoch],
  );
  const unavailable = useCallback(
    () =>
      collaboration.clear(
        new ApiClientError("Group unavailable", 404, "GROUP_UNAVAILABLE"),
      ),
    [collaboration.clear],
  );
  const fallbackAuth = useMemo(
    () => ({ getAccessToken: () => null, refresh: async () => ({ id: "" }) }),
    [],
  );
  const streamStatus = useMessageStream({
    auth: streamAuth ?? fallbackAuth,
    client: streamClient,
    conversationId: groupId,
    actor: userId,
    enabled:
      Boolean(streamAuth) &&
      authenticated &&
      Boolean(resource.data) &&
      !collaboration.accessLost,
    onReconcile: collaboration.reconcile,
    onUnavailable: unavailable,
  });
  useEffect(() => {
    if (!authenticated || !resource.data || collaboration.accessLost) return;
    const timer = window.setInterval(() => {
      void collaboration.reconcile();
    }, 25000);
    const refresh = () => {
      void collaboration.reconcile();
    };
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [
    authenticated,
    Boolean(resource.data),
    collaboration.accessLost,
    collaboration.reconcile,
  ]);
  // Either current projection may observe a downgrade before the other.
  const metadataRole = resource.data?.group.role;
  const levels = { MEMBER: 0, MODERATOR: 1, OWNER: 2 };
  const currentRole =
    (collaboration.loading && collaboration.version === "0") || !metadataRole
      ? metadataRole
      : levels[metadataRole] < levels[collaboration.role]
        ? metadataRole
        : collaboration.role;
  const observedRole = useRef<{
    scope: string;
    role: typeof collaboration.role;
  } | null>(null);
  useEffect(() => {
    const metadataRole = resource.data?.group.role;
    if (!metadataRole || collaboration.loading) return;
    const scope = userId + ":" + groupId;
    const previous = observedRole.current;
    observedRole.current = { scope, role: collaboration.role };
    if (previous?.scope === scope && previous.role === collaboration.role)
      return;
    if (metadataRole !== collaboration.role) void resource.refresh();
  }, [
    resource.data?.group.role,
    collaboration.loading,
    collaboration.role,
    resource.refresh,
    userId,
    groupId,
  ]);
  const data =
    resource.data && currentRole
      ? {
          ...resource.data,
          group: { ...resource.data.group, role: currentRole },
          invitations: canManage(currentRole)
            ? resource.data.invitations
            : null,
          reports: canModerate(currentRole) ? resource.data.reports : null,
        }
      : null;
  const effectiveResource = { ...resource, data };
  const [sending, setSending] = useState(false);
  const send = async (input: GroupWriteInput) => {
    if (sending || collaboration.accessLost || !data) return false;
    setSending(true);
    try {
      const result = await resource.perform(() => api.write(groupId, input));
      if (result === undefined) return false;
      await collaboration.reconcile();
      return true;
    } finally {
      setSending(false);
    }
  };

  const {
    pending,
    setPending,
    issued,
    setIssued,
    busy,
    message,
    issue,
    confirm,
  } = useStudyGroupActions(
    api,
    groupId,
    userId,
    authenticated,
    effectiveResource,
  );
  const selected =
    (tab === "invitations" && !data?.invitations) ||
    (tab === "reports" && !data?.reports)
      ? "discussion"
      : tab;
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t("groups.title")}>
        <Link to="/community">{t("groups.community")}</Link> /{" "}
        <Link to="/community/groups">{t("groups.title")}</Link>
      </nav>
      {!data ? <h1>{t("groups.title")}</h1> : null}
      {authLoading || resource.loading ? (
        <p role="status">{t("groups.loading")}</p>
      ) : null}
      {!authLoading && !authenticated ? (
        <Button
          onClick={() =>
            navigate("/login", {
              state: {
                from: "/community/groups/" + encodeURIComponent(groupId),
              },
            })
          }
        >
          {t("groups.login")}
        </Button>
      ) : null}
      {resource.error ? (
        <p role="alert">
          {t(groupErrorKey(resource.error))}{" "}
          <Button variant="quiet" onClick={() => void resource.refresh()}>
            {t("groups.retry")}
          </Button>
        </p>
      ) : null}
      {data ? (
        <>
          <StudyGroupHeader group={data.group}>
              {canManage(data.group.role) ? (
                <>
                  {connectionsApi ? (
                    <ConnectedPartnerInvitation
                      api={api}
                      connectionsApi={connectionsApi}
                      groupId={groupId}
                      groupName={data.group.name}
                      userId={userId}
                      enabled={authenticated && !resource.error}
                    />
                  ) : null}
                  <Button disabled={busy} onClick={() => void issue()}>
                    {t("groups.issue")}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => setPending({ action: "archive" })}
                  >
                    {t("groups.archive")}
                  </Button>
                  <p>{t("groups.transferFirst")}</p>
                </>
              ) : (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setPending({ action: "leave" })}
                >
                  {t("groups.leave")}
                </Button>
              )}
          </StudyGroupHeader>
          <p className={styles.privacy}>{t("groups.privacy")}</p>
          <p role="status" aria-live="polite">
            {message}
          </p>
          <div
            className={styles.tabs}
            role="navigation"
            aria-label={t("groups.title")}
          >
            {(
              [
                "discussion",
                "members",
                ...(canManage(data.group.role) ? ["invitations"] : []),
                ...(canModerate(data.group.role) ? ["reports"] : []),
              ] as const
            ).map((x) => (
              <Button
                key={x}
                aria-pressed={selected === x}
                aria-controls={selected === x ? "group-panel-" + x : undefined}
                id={"group-tab-" + x}
                variant={selected === x ? "primary" : "quiet"}
                onClick={() => {
                  setTab(x as typeof tab);
                  setPage(1);
                }}
              >
                {t(`groups.${x as typeof tab}`)}
              </Button>
            ))}
          </div>
          <div
            role="region"
            id={"group-panel-" + selected}
            aria-labelledby={"group-tab-" + selected}
            className={styles.panel}
          >
            {selected === "discussion" ? (
              <>
                <div className={styles.collaborationStatus}>
                  <p role="status">
                    {t(`groups.collaboration.${streamStatus}`)} ·{" "}
                    {t("groups.collaboration.unread", {
                      count: Number(collaboration.unreadCount),
                    })}
                  </p>
                  <Button
                    variant="quiet"
                    onClick={() => void collaboration.reconcile()}
                    disabled={busy || collaboration.loading}
                  >
                    {t("groups.collaboration.refresh")}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={
                      busy || !collaboration.texts.some((text) => !text.hidden)
                    }
                    onClick={() => {
                      const last = collaboration.texts
                        .filter((text) => !text.hidden)
                        .at(-1);
                      if (last) void collaboration.markRead(last.id);
                    }}
                  >
                    {t("groups.collaboration.markRead")}
                  </Button>
                </div>
                {collaboration.error ? (
                  <p role="alert">{t(groupErrorKey(collaboration.error))}</p>
                ) : null}
                <p className={styles.note}>{t("groups.collaboration.full")}</p>
                <GroupTextPanel
                  key={userId + ":" + groupId + ":" + collaboration.epoch}
                  role={data.group.role}
                  texts={collaboration.texts}
                  busy={busy || sending}
                  contextQueue={contextQueue}
                  onWrite={send}
                  onAction={(action, id) => setPending({ action, id })}
                />
              </>
            ) : null}
            {selected === "members" ? (
              <>
                <GroupMembers
                  role={data.group.role}
                  userId={userId}
                  members={data.members.items}
                  busy={busy}
                  onAction={(action, id) => setPending({ action, id })}
                />
                <GroupPagination
                  value={data.members}
                  onChange={setPage}
                  busy={busy}
                />
              </>
            ) : null}
            {selected === "invitations" && data.invitations ? (
              <>
                <GroupInvitations
                  items={data.invitations.items}
                  busy={busy}
                  onIssue={() => void issue()}
                  onRevoke={(id) => setPending({ action: "revoke", id })}
                />
                <GroupPagination
                  value={data.invitations}
                  onChange={setPage}
                  busy={busy}
                />
              </>
            ) : null}
            {selected === "reports" && data.reports ? (
              <>
                <GroupReports
                  items={data.reports.items}
                  busy={busy}
                  onResolve={(id) => setPending({ action: "resolve", id })}
                  onHide={(id) => setPending({ action: "hide", id })}
                />
                <GroupPagination
                  value={data.reports}
                  onChange={setPage}
                  busy={busy}
                />
              </>
            ) : null}
          </div>
          <p className={styles.note}>{t("groups.bounds")}</p>
          {pending ? (
            <GroupActionDialog
              key={pending.action + pending.id}
              pending={pending}
              groupName={data.group.name}
              targetName={
                data.members.items.find(
                  (member) => member.userId === pending.id,
                )?.displayName
              }
              busy={busy}
              onClose={() => setPending(null)}
              onConfirm={confirm}
            />
          ) : null}
          {issued && canManage(data.group.role) ? (
            <IssuedInvitationDialog
              invite={issued}
              groupId={groupId}
              onClose={() => setIssued(null)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
