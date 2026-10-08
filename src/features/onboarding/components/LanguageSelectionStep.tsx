import { languageDisplayName } from '../../ui-locale/language-display';
import { translate, type UiLocale, type TranslationKey } from '../../ui-locale/ui-locale';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { KeyboardEvent, RefObject } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import type { LanguageCatalogItem, LanguageRole, OnboardingDraft } from '../onboarding.types';
import styles from './LanguageSelectionStep.module.css';

type PickerMode = 'spoken' | 'learning';

interface LanguageSelectionStepProps {
  mode: PickerMode;
  errorId?: string;
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
  errorId,
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
  const { t, locale } = useUiLocale();
  const learningMode = mode === 'learning';
  const chipCodes = learningMode ? draft.learningCodes : unique([...draft.nativeCodes, ...draft.knownCodes]);

  return (
    <div className={styles.stepContent}>
      <div className={styles.pickerSection}>
        <label className={styles.fieldLabel} htmlFor={searchId}>{t('onboarding.find.and.add.languages')}</label>
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
            aria-invalid={errorId ? true : undefined}
            aria-describedby={errorId}
            autoComplete='off'
            value={searchValue}
            placeholder={t('onboarding.enter.a.language.name.for.example.vietnamese.english')}
            onFocus={onSearchFocus}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </div>
        {searchOpen && searchValue.trim() ? (
          <ul className={styles.searchResults} id={listId} role='listbox' aria-label={t('onboarding.language.results')}>
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
                      <strong>{languageDisplayName(language, locale)}</strong>
                      <small>{language.nativeName}</small>
                    </span>
                    <span className={styles.searchResultAction}>{selected ? t('onboarding.selected') : t('onboarding.add')}</span>
                  </button>
                </li>
              );
            }) : <li className={styles.noResults}>{t('onboarding.no.matching.languages.found')}</li>}
          </ul>
        ) : null}
        <div className={styles.selectedLanguages} aria-live='polite'>
          <span className={styles.selectedLabel}>{learningMode ? t('onboarding.selected.for.learning') : t('onboarding.selected.for.your.profile')}</span>
          {chipCodes.length > 0 ? chipCodes.flatMap((code) => {
            const language = findLanguage(catalog, code);
            const roles = learningMode ? ['learning' as const] : [
              ...(draft.nativeCodes.includes(code) ? ['native' as const] : []),
              ...(draft.knownCodes.includes(code) ? ['known' as const] : []),
            ];
            return roles.map((role) => (
              <span className={`${styles.languageChip} ${role === 'native' ? styles.languageChipNative : role === 'learning' ? styles.languageChipLearning : styles.languageChipKnown}`} key={`${code}-${role}`}>
                <span className={styles.chipDot} aria-hidden='true' />
                <span>{languageDisplayName(language, locale)} ({roleLabel(role, locale)})</span>
                <button type='button' aria-label={t('onboarding.remove.language', { name: languageDisplayName(language, locale), role: roleLabel(role, locale) })} onClick={() => onRemoveRole(code, role)}>
                  <Icon name='x' size={16} />
                </button>
              </span>
            ));
          }) : <span className={styles.emptySelection}>{t('onboarding.no.languages.selected')}</span>}
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
  const { t, locale } = useUiLocale();
  const selectedCodes = role === 'native' ? draft.nativeCodes : role === 'known' ? draft.knownCodes : draft.learningCodes;
  const title = role === 'native'
    ? t('onboarding.native.languages.mother.tongue')
    : role === 'known'
      ? t('onboarding.languages.you.know.or.can.use.for.basic.conversations')
      : t('onboarding.learning.languages');
  const helper = role === 'native'
    ? t('onboarding.languages.you.have.used.naturally.since.childhood.you.can.choose.more.than.one')
    : role === 'known'
      ? t('onboarding.choose.languages.you.can.read.or.use.in.everyday.conversations')
      : t('onboarding.choose.languages.you.want.to.explore.with.the.community');
  const actionLabel = role === 'native' ? t('onboarding.native.language') : role === 'known' ? t('onboarding.known.language') : t('onboarding.learning.language');

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
                <strong>{languageDisplayName(language, locale)}</strong>
                <small>{language.nativeName}</small>
              </span>
              <span id={languageActionId} className={styles.srOnly}>{selected ? t('onboarding.selected') : t('onboarding.choose')}  {t('onboarding.as')} {actionLabel}</span>
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

function roleLabel(role: LanguageRole, locale: UiLocale): string {
  const t = (key: TranslationKey) => translate(locale, key);
  if (role === 'native') return t('onboarding.native');
  if (role === 'known') return t('onboarding.known');
  return t('onboarding.learning');
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
