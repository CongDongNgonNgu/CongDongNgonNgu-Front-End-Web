import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
      <nav aria-label={t("groups.community")}>
        <Link to="/community">{t("groups.community")}</Link> /{" "}
        <Link to="/community/groups">{t("groups.title")}</Link>
      </nav>
      <header className={styles.heading}>
        <div>
          <h1>{t(acceptance ? "groups.join" : "groups.title")}</h1>
          <p>{t("groups.privacy")}</p>
        </div>
        {authenticated && !acceptance ? (
          <div className={styles.actions}>
            <Button onClick={() => setCreate(true)}>
              {t("groups.create")}
            </Button>
            <Link to="/community/groups/invitations">{t("groups.join")}</Link>
          </div>
        ) : null}
      </header>
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
      {resource.error ? (
        <p role="alert">
          {t(groupErrorKey(resource.error))}{" "}
          <Button variant="quiet" onClick={() => void resource.refresh()}>
            {t("groups.retry")}
          </Button>
        </p>
      ) : null}
      {authenticated && acceptance ? (
        <GroupEntryForm mode="accept" busy={busy} onSubmit={submit} />
      ) : null}
      {resource.data ? (
        <>
          <ul className={styles.list}>
            {resource.data.items.map((g) => (
              <li key={g.id}>
                <h2>
                  <Link to={"/community/groups/" + encodeURIComponent(g.id)}>
                    {g.name}
                  </Link>
                </h2>
                <p>{g.description}</p>
                <span>{t(`groups.${g.role}`)}</span>
              </li>
            ))}
          </ul>
          {resource.data.items.length === 0 ? <p>{t("groups.empty")}</p> : null}
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
        <GroupEntryForm mode="create" busy={busy} onSubmit={submit} />
      </Dialog>
    </div>
  );
}
