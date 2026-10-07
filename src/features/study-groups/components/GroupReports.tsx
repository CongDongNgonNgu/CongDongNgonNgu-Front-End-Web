import { Button } from "../../../components/ui/Button";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import type { GroupReport } from "../study-groups.types";
import styles from "./GroupReports.module.css";
export function GroupReports({
  items,
  busy,
  onResolve,
  onHide,
}: {
  items: GroupReport[];
  busy: boolean;
  onResolve: (id: string) => void;
  onHide: (id: string) => void;
}) {
  const { t } = useUiLocale();
  return (
    <section aria-label={t("groups.reports")}>
      {items.length === 0 ? <p>{t("groups.noReports")}</p> : null}
      <ul className={styles.list}>
        {items.map((x) => (
          <li key={x.id}>
            <code>{x.textId}</code>
            <p>{x.reason}</p>
            <span>{t(`groups.${x.status}`)}</span>
            {x.status === "OPEN" ? (
              <div>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onResolve(x.id)}
                >
                  {t("groups.resolve")}
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => onHide(x.textId)}
                >
                  {t("groups.hide")}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
