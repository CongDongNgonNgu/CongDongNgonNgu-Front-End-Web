import { useId } from 'react';
import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import styles from './UiLocaleSelector.module.css';

/** This control changes browser UI preferences only, never a learning-language field. */
export function UiLocaleSelector({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const { locale, setLocale, t } = useUiLocale();
  return <div className={styles.control}>
    <label className={compact ? 'visually-hidden' : styles.label} htmlFor={id}>{t('shell.uiLanguage')}</label>
    <select id={id} className={styles.select} value={locale} onChange={(event) => setLocale(event.target.value)}>
      <option value='vi' lang='vi'>Tiếng Việt</option>
      <option value='en' lang='en'>English</option>
    </select>
  </div>;
}
