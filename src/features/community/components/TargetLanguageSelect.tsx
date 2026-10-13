import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { SelectControl } from '../../../components/ui/FormControls';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import styles from '../pages/CommunityRequestPage.module.css';

interface TargetLanguageSelectProps {
  id: string;
  value: string;
  languages: LanguageCatalogItem[];
  loading: boolean;
  error?: string;
  onChange: (value: string) => void;
}

export function TargetLanguageSelect({
  id,
  value,
  languages,
  loading,
  error,
  onChange,
}: TargetLanguageSelectProps) {
  const { t } = useUiLocale();
  return (
    <SelectControl
      id={id}
      label={t("community.posts.target.language")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      hint={t("community.posts.choose.a.language.currently.active.in.the.community")}
      disabled={loading || languages.length === 0}
      required
    >
      <option value=''>
        {loading ? t("community.posts.loading.languages") : languages.length === 0 ? t("community.posts.no.languages.available") : t("community.posts.choose.a.language")}
      </option>
      {languages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.nativeName} · {language.englishName}
        </option>
      ))}
    </SelectControl>
  );
}

export function CatalogError({ onRetry }: { onRetry: () => void }) {
  const { t } = useUiLocale();
  return (
    <div className={styles.catalogError} role='alert'>
      <span>{t("community.posts.unable.to.load.languages.please.try.again")}</span>
      <button type='button' onClick={onRetry}>{t("community.posts.try.again")}</button>
    </div>
  );
}
