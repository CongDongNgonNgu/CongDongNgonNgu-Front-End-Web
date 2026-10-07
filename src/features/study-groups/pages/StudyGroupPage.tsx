import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { useAuth } from "../../auth/AuthProvider";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { StudyGroupsApi } from "../study-groups.api";
import { useStudyGroup } from "../hooks/useStudyGroup";
import { canManage, canModerate, groupErrorKey } from "../study-groups.policy";
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
  return (
    <StudyGroupPageView
      key={auth.user?.id + ":" + groupId}
      api={api}
      groupId={groupId}
      userId={auth.user?.id ?? ""}
      authenticated={auth.status === "authenticated"}
      authLoading={auth.status === "loading"}
    />
  );
}
export function StudyGroupPageView({
  api,
  groupId,
  userId,
  authenticated,
  authLoading = false,
}: {
  api: StudyGroupsApi;
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
  const data = resource.data;
  const {
    pending,
    setPending,
    issued,
    setIssued,
    busy,
    message,
    run,
    issue,
    confirm,
  } = useStudyGroupActions(api, groupId, userId, authenticated, resource);
  const selected =
    (tab === "invitations" && !data?.invitations) ||
    (tab === "reports" && !data?.reports)
      ? "discussion"
      : tab;
  return (
    <div className={styles.page}>
      <nav aria-label={t("groups.title")}>
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
          <header className={styles.heading}>
            <div>
              <h1>{data.group.name}</h1>
              <p>{data.group.description}</p>
              <span>{t(`groups.${data.group.role}`)}</span>
            </div>
            <div className={styles.actions}>
              {canManage(data.group.role) ? (
                <>
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
            </div>
          </header>
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
                aria-controls={"group-panel-" + x}
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
                <GroupTextPanel
                  key={groupId}
                  role={data.group.role}
                  texts={data.texts.items}
                  busy={busy}
                  onWrite={(body) => run(() => api.write(groupId, body))}
                  onAction={(action, id) => setPending({ action, id })}
                />
                <GroupPagination
                  value={data.texts}
                  onChange={setPage}
                  busy={busy}
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
