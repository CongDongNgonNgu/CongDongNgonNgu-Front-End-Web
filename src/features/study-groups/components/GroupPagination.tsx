import { Button } from "../../../components/ui/Button";
import { useUiLocale } from "../../ui-locale/UiLocaleProvider";
import type { GroupPage } from "../study-groups.types";
export function GroupPagination({
  value,
  onChange,
  busy = false,
}: {
  value: GroupPage<unknown>;
  onChange: (page: number) => void;
  busy?: boolean;
}) {
  const { t } = useUiLocale();
  const pages = Math.max(1, Math.ceil(value.total / value.limit));
  if (pages <= 1) return null;
  return (
    <nav aria-label={t("groups.page", { page: value.page, pages })}>
      <Button
        variant="quiet"
        disabled={busy || value.page <= 1}
        onClick={() => onChange(value.page - 1)}
      >
        {t("groups.previous")}
      </Button>
      <span aria-live="polite">
        {t("groups.page", { page: value.page, pages })}
      </span>
      <Button
        variant="quiet"
        disabled={busy || value.page >= pages}
        onClick={() => onChange(value.page + 1)}
      >
        {t("groups.next")}
      </Button>
    </nav>
  );
}
