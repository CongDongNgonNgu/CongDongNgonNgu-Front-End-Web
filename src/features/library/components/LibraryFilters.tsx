import { useEffect, useState } from 'react';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { CEFR_LEVELS } from '../../languages/languages.types';
import { LIBRARY_RESOURCE_TYPES, type LibraryFilters as LibraryFilterValues } from '../library.types';
import styles from './LibraryFilters.module.css';

const resourceTypeLabels: Record<(typeof LIBRARY_RESOURCE_TYPES)[number], string> = {
  VOCABULARY: 'Từ vựng',
  SENTENCE: 'Câu mẫu',
  TRANSLATION: 'Bản dịch',
  GRAMMAR_ITEM: 'Ngữ pháp',
  DIALOGUE: 'Hội thoại',
  IDIOM: 'Thành ngữ',
  SLANG: 'Tiếng lóng',
  CULTURAL_NOTE: 'Ghi chú văn hoá',
  PRONUNCIATION: 'Phát âm',
  LEARNING_COLLECTION: 'Bộ sưu tập',
};

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
        <span className={styles.filterKicker}>Refine</span>
        <h2>Bộ lọc</h2>
      </div>

      <label className={styles.field} htmlFor={`${idPrefix}-language`}>
        <span>Ngôn ngữ</span>
        <select
          id={`${idPrefix}-language`}
          value={values.language}
          onChange={(event) => onChange('language', event.target.value)}
          disabled={isLoadingLanguages && languages.length === 0}
        >
          <option value=''>Tất cả ngôn ngữ</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.nativeName} · {language.code.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field} htmlFor={`${idPrefix}-type`}>
        <span>Loại tài nguyên</span>
        <select id={`${idPrefix}-type`} value={values.type} onChange={(event) => onChange('type', event.target.value)}>
          <option value=''>Tất cả loại</option>
          {LIBRARY_RESOURCE_TYPES.map((type) => <option key={type} value={type}>{resourceTypeLabels[type]}</option>)}
        </select>
      </label>

      <label className={styles.field} htmlFor={`${idPrefix}-topic`}>
        <span>Chủ đề</span>
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
          placeholder='Ví dụ: travel'
          inputMode='search'
        />
      </label>

      <label className={styles.field} htmlFor={`${idPrefix}-level`}>
        <span>Trình độ CEFR</span>
        <select id={`${idPrefix}-level`} value={values.level} onChange={(event) => onChange('level', event.target.value)}>
          <option value=''>Mọi trình độ</option>
          {CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
      </label>

      <button className={styles.clearButton} type='button' onClick={onClear} disabled={!hasFilters}>
        Xoá bộ lọc
      </button>
    </div>
  );
}
