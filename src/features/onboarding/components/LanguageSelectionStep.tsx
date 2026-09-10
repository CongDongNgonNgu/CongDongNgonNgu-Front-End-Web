import type { KeyboardEvent, RefObject } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import type { LanguageCatalogItem, LanguageRole, OnboardingDraft } from '../onboarding.types';
import styles from './LanguageSelectionStep.module.css';

type PickerMode = 'spoken' | 'learning';

interface LanguageSelectionStepProps {
  mode: PickerMode;
  draft: OnboardingDraft;
  catalog: LanguageCatalogItem[];
  searchId: string;
  listId: string;
  searchRef: RefObject<HTMLInputElement>;
  searchValue: string;
  searchOpen: boolean;
  activeSearchIndex: number;
  filteredSearchResults: LanguageCatalogItem[];
  onSearchFocus: () => void;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChooseLanguage: (code: string) => void;
  onRemoveRole: (code: string, role: LanguageRole) => void;
  onToggleRole: (code: string, role: LanguageRole) => void;
}

export function LanguageSelectionStep({
  mode,
  draft,
  catalog,
  searchId,
  listId,
  searchRef,
  searchValue,
  searchOpen,
  activeSearchIndex,
  filteredSearchResults,
  onSearchFocus,
  onSearchChange,
  onSearchKeyDown,
  onChooseLanguage,
  onRemoveRole,
  onToggleRole,
}: LanguageSelectionStepProps) {
  const learningMode = mode === 'learning';
  const chipCodes = learningMode ? draft.learningCodes : unique([...draft.nativeCodes, ...draft.knownCodes]);

  return (
    <div className={styles.stepContent}>
      <div className={styles.pickerSection}>
        <label className={styles.fieldLabel} htmlFor={searchId}>Tìm và thêm ngôn ngữ</label>
        <div className={styles.comboboxShell}>
          <Icon name='search' size={20} />
          <input
            ref={searchRef}
            id={searchId}
            className={styles.comboboxInput}
            role='combobox'
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? listId : undefined}
            aria-autocomplete='list'
            autoComplete='off'
            value={searchValue}
            placeholder='Nhập tên ngôn ngữ (ví dụ: Tiếng Việt, English, 日本語...)'
            onFocus={onSearchFocus}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </div>
        {searchOpen && searchValue.trim() ? (
          <ul className={styles.searchResults} id={listId} role='listbox' aria-label='Kết quả ngôn ngữ'>
            {filteredSearchResults.length > 0 ? filteredSearchResults.map((language, index) => {
              const selected = learningMode
                ? draft.learningCodes.includes(language.code)
                : draft.nativeCodes.includes(language.code) || draft.knownCodes.includes(language.code);
              return (
                <li key={language.code}>
                  <button
                    className={index === activeSearchIndex ? styles.searchResultActive : styles.searchResult}
                    type='button'
                    role='option'
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onChooseLanguage(language.code)}
                  >
                    <span>
                      <strong>{language.nativeName}</strong>
                      <small>{language.vietnameseName} · {language.englishName}</small>
                    </span>
                    <span className={styles.searchResultAction}>{selected ? 'Đã chọn' : 'Thêm'}</span>
                  </button>
                </li>
              );
            }) : <li className={styles.noResults}>Không tìm thấy ngôn ngữ phù hợp.</li>}
          </ul>
        ) : null}
        <div className={styles.selectedLanguages} aria-live='polite'>
          <span className={styles.selectedLabel}>{learningMode ? 'Đã chọn để học:' : 'Đã chọn cho hồ sơ của bạn:'}</span>
          {chipCodes.length > 0 ? chipCodes.flatMap((code) => {
            const language = findLanguage(catalog, code);
            const roles = learningMode ? ['learning' as const] : [
              ...(draft.nativeCodes.includes(code) ? ['native' as const] : []),
              ...(draft.knownCodes.includes(code) ? ['known' as const] : []),
            ];
            return roles.map((role) => (
              <span className={`${styles.languageChip} ${role === 'native' ? styles.languageChipNative : role === 'learning' ? styles.languageChipLearning : styles.languageChipKnown}`} key={`${code}-${role}`}>
                <span className={styles.chipDot} aria-hidden='true' />
                <span>{language.nativeName} ({roleLabel(role)})</span>
                <button type='button' aria-label={`Xóa ${language.nativeName} (${roleLabel(role)})`} onClick={() => onRemoveRole(code, role)}>
                  <Icon name='x' size={16} />
                </button>
              </span>
            ));
          }) : <span className={styles.emptySelection}>Chưa có lựa chọn nào</span>}
        </div>
      </div>

      {learningMode ? (
        <LanguageGroup role='learning' draft={draft} catalog={catalog} searchId={searchId} onToggleRole={onToggleRole} />
      ) : (
        <div className={styles.languageGroups}>
          <LanguageGroup role='native' draft={draft} catalog={catalog} searchId={searchId} onToggleRole={onToggleRole} />
          <LanguageGroup role='known' draft={draft} catalog={catalog} searchId={searchId} onToggleRole={onToggleRole} />
        </div>
      )}
    </div>
  );
}

interface LanguageGroupProps {
  role: LanguageRole;
  draft: OnboardingDraft;
  catalog: LanguageCatalogItem[];
  searchId: string;
  onToggleRole: (code: string, role: LanguageRole) => void;
}

function LanguageGroup({ role, draft, catalog, searchId, onToggleRole }: LanguageGroupProps) {
  const selectedCodes = role === 'native' ? draft.nativeCodes : role === 'known' ? draft.knownCodes : draft.learningCodes;
  const title = role === 'native'
    ? 'Ngôn ngữ bản ngữ (Tiếng mẹ đẻ)'
    : role === 'known'
      ? 'Ngôn ngữ bạn đã biết hoặc có thể giao tiếp cơ bản'
      : 'Ngôn ngữ bạn muốn học';
  const helper = role === 'native'
    ? 'Ngôn ngữ bạn dùng tự nhiên nhất từ nhỏ. Bạn có thể chọn nhiều hơn một.'
    : role === 'known'
      ? 'Chọn các ngôn ngữ bạn có thể đọc hiểu hoặc trò chuyện hàng ngày.'
      : 'Chọn những ngôn ngữ bạn muốn khám phá cùng cộng đồng.';
  const actionLabel = role === 'native' ? 'ngôn ngữ bản ngữ' : role === 'known' ? 'ngôn ngữ đã biết' : 'ngôn ngữ muốn học';

  return (
    <fieldset className={styles.languageGroup}>
      <legend>{title}</legend>
      <p className={styles.groupHelper}>{helper}</p>
      <div className={styles.choiceGrid} role='group' aria-label={title}>
        {catalog.map((language) => {
          const selected = selectedCodes.includes(language.code);
          const languageLabelId = `${searchId}-${role}-${language.code}-label`;
          const languageActionId = `${searchId}-${role}-${language.code}-action`;
          return (
            <button
              className={`${styles.languageChoice} ${selected ? styles.languageChoiceSelected : ''}`}
              type='button'
              key={language.code}
              aria-pressed={selected}
              aria-labelledby={languageLabelId}
              aria-describedby={languageActionId}
              onClick={() => onToggleRole(language.code, role)}
            >
              <span id={languageLabelId}>
                <strong>{language.nativeName}</strong>
                <small>{language.englishName}</small>
              </span>
              <span id={languageActionId} className={styles.srOnly}>{selected ? 'Đã chọn' : 'Chọn'} làm {actionLabel}</span>
              <span className={styles.checkIndicator} aria-hidden='true'>{selected ? <Icon name='check-circle' size={18} /> : null}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function findLanguage(catalog: LanguageCatalogItem[], code: string): LanguageCatalogItem {
  return catalog.find((language) => language.code === code) ?? {
    code,
    slug: code,
    nativeName: code,
    englishName: code,
    vietnameseName: code,
    direction: 'ltr',
    active: true,
    launch: false,
    sortOrder: Number.MAX_SAFE_INTEGER,
  };
}

function roleLabel(role: LanguageRole): string {
  if (role === 'native') return 'Bản ngữ';
  if (role === 'known') return 'Đã biết';
  return 'Đang học';
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
