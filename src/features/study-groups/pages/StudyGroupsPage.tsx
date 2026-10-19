import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon/Icon";
import { StudyGroupSummary } from "../components/StudyGroupSummary";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Overlays";
import { useAuth } from "../../auth/AuthProvider";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import { StudyGroupsApi } from "../study-groups.api";
import { useGroupResource } from "../hooks/useGroupResource";
import { groupErrorKey } from "../study-groups.policy";
import { GroupEntryForm } from "../components/GroupEntryForm";
import { GroupPagination } from "../components/GroupPagination";
import styles from "./StudyGroupsPage.module.css";
export function StudyGroupsPage() {
  const auth = useAuth();
  const api = useMemo(() => new StudyGroupsApi(auth.api), [auth.api]);
  return (
    <StudyGroupsPageView
      api={api}
      authenticated={auth.status === "authenticated"}
      authLoading={auth.status === "loading"}
      userId={auth.user?.id ?? ""}
    />
  );
}
export function StudyGroupsPageView({
  api,
  authenticated,
  authLoading = false,
  userId = "",
  accept = false,
}: {
  api: StudyGroupsApi;
  authenticated: boolean;
  authLoading?: boolean;
  userId?: string;
  accept?: boolean;
}) {
  const { t } = useUiLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setCreate(false); }, [userId, authenticated, location.pathname]);
  const acceptance = accept || location.pathname.endsWith("/invitations");
  const load = useCallback(() => api.list(page), [api, page]);
  const resource = useGroupResource(
    userId + ":" + page,
    authenticated && !acceptance,
    load,
  );
  async function submit(first: string, second: string) {
    setBusy(true);
    const result = await resource.perform(() =>
      acceptance ? api.accept(first, second) : api.create(first, second),
    );
    setBusy(false);
    if (!result) return false;
    setCreate(false);
    navigate("/community/groups/" + encodeURIComponent(result.id));
    return true;
  }
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t("groups.community")}>
        <Link to="/community">{t("groups.community")}</Link> /{" "}
        <Link to="/community/groups">{t("groups.title")}</Link>
      </nav>
      <header className={styles.heading}>
        <div>
          <h1>{t(acceptance ? "groups.join" : "groups.title")}</h1>
          <p>{t(acceptance ? "groups.createPrivacy" : "groups.indexIntro")}</p>
        </div>
        {authenticated && !acceptance ? (
          <div className={styles.actions}>
            <Button onClick={() => setCreate(true)}>
              {t("groups.create")}
            </Button>
            <Link className={styles.acceptLink} to="/community/groups/invitations">{t("groups.join")}</Link>
          </div>
        ) : null}
      </header>
      {!acceptance ? <p className={styles.privacy}><Icon name="lock" size={16}/>{t("groups.visibility.privateInviteOnly")}</p> : null}
      {authLoading || resource.loading ? (
        <p role="status">{t("groups.loading")}</p>
      ) : null}
      {!authLoading && !authenticated ? (
        <Button
          onClick={() =>
            navigate("/login", { state: { from: location.pathname } })
          }
        >
          {t("groups.login")}
        </Button>
      ) : null}
      {resource.error && !create ? (
        <p role="alert">
          {t(groupErrorKey(resource.error))}{" "}
          <Button variant="quiet" onClick={() => void resource.refresh()}>
            {t("groups.retry")}
          </Button>
        </p>
      ) : null}
      {authenticated && acceptance ? (
        <div className={styles.acceptance}><GroupEntryForm key={userId} mode="accept" busy={busy} onSubmit={submit} /></div>
      ) : null}
      {resource.data ? (
        <>
          <ul className={styles.list}>
            {resource.data.items.map(group => <StudyGroupSummary key={group.id} group={group}/>)}
          </ul>
          {resource.data.items.length === 0 ? <div className={styles.empty}>
            <Icon name="book-open" size={24}/>
            <h2>{t("groups.empty")}</h2><p>{t("groups.emptyHelp")}</p>
          </div> : null}
          <GroupPagination value={resource.data} onChange={setPage} />
        </>
      ) : null}
      <p className={styles.note}>{t("groups.bounds")}</p>
      <Dialog
        open={create && authenticated}
        title={t("groups.create")}
        closeLabel={t("groups.close")}
        onClose={() => {
          if (!busy) setCreate(false);
        }}
      >
        {resource.error ? <p role="alert">{t(groupErrorKey(resource.error))}</p> : null}
        <GroupEntryForm key={userId} mode="create" busy={busy} onSubmit={submit} onCancel={() => setCreate(false)} />
      </Dialog>
    </div>
  );
}

