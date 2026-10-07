import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useEffect, useState } from 'react';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { CEFR_LEVELS } from '../../languages/languages.types';
import { LIBRARY_RESOURCE_TYPES, type LibraryFilters as LibraryFilterValues } from '../library.types';
import { resourceTypeLabelKeys } from '../library.presentation';
import styles from './LibraryFilters.module.css';


interface LibraryFiltersProps {
  values: LibraryFilterValues;
  languages: LanguageCatalogItem[];
  isLoadingLanguages?: boolean;
  idPrefix: string;
  onChange: (key: keyof LibraryFilterValues, value: string) => void;
  onClear: () => void;
}

export function LibraryFilters({
  values,
  languages,
  isLoadingLanguages = false,
  idPrefix,
  onChange,
  onClear,
}: LibraryFiltersProps) {
  const { t } = useUiLocale();
  const [topicDraft, setTopicDraft] = useState(values.topic);
  const hasFilters = Boolean(values.language || values.type || values.topic || values.level);

  useEffect(() => {
    setTopicDraft(values.topic);
  }, [values.topic]);

  const commitTopic = () => {
    if (topicDraft.trim() !== values.topic) onChange('topic', topicDraft);
  };

  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterHeading}>
        <span className={styles.filterKicker}>{t('library.refine')}</span>
        <h2>{t('library.filters')}</h2>
      </div>

      <label className={styles.field} htmlFor={`${idPrefix}-language`}>
        <span>{t('library.language')}</span>
        <select
          id={`${idPrefix}-language`}
          value={values.language}
          onChange={(event) => onChange('language', event.target.value)}
          disabled={isLoadingLanguages && languages.length === 0}
        >
          <option value=''>{t('library.allLanguages')}</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.nativeName} · {language.code.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field} htmlFor={`${idPrefix}-type`}>
        <span>{t('library.resourceType')}</span>
        <select id={`${idPrefix}-type`} value={values.type} onChange={(event) => onChange('type', event.target.value)}>
          <option value=''>{t('library.allTypes')}</option>
          {LIBRARY_RESOURCE_TYPES.map((type) => <option key={type} value={type}>{t(type === 'CULTURAL_NOTE' ? 'library.typeCultureNote' : resourceTypeLabelKeys[type])}</option>)}
        </select>
      </label>

      <label className={styles.field} htmlFor={`${idPrefix}-topic`}>
        <span>{t('library.topic')}</span>
        <input
          id={`${idPrefix}-topic`}
          type='text'
          value={topicDraft}
          onChange={(event) => setTopicDraft(event.target.value)}
          onBlur={commitTopic}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTopic();
            }
          }}
          placeholder={t('library.topicExample')}
          inputMode='search'
        />
      </label>

      <label className={styles.field} htmlFor={`${idPrefix}-level`}>
        <span>{t('library.level')}</span>
        <select id={`${idPrefix}-level`} value={values.level} onChange={(event) => onChange('level', event.target.value)}>
          <option value=''>{t('library.allLevels')}</option>
          {CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
      </label>

      <button className={styles.clearButton} type='button' onClick={onClear} disabled={!hasFilters}>
        {t('library.clearFilters')}
      </button>
    </div>
  );
}
