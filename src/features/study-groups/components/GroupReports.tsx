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
      <h2 className={styles.title}>{t("groups.reports")}</h2>
      {items.length === 0 ? <p>{t("groups.noReports")}</p> : null}
      <ul className={styles.list}>
        {items.map((x) => (
          <li key={x.id}>
            <span className={styles.state}>{t(`groups.${x.status}`)}</span>
            <p className={styles.reference}>{t("groups.reportedText")}: <code>{x.textId}</code></p>
            <p>{x.reason}</p>
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
