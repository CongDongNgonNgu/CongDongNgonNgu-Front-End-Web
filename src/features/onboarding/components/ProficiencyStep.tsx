import { languageDisplayName } from '../../ui-locale/language-display';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { MutableRefObject } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { PROFICIENCY_VALUES, type DeclaredProficiency, type LanguageCatalogItem, type OnboardingDraft } from '../onboarding.types';
import styles from './ProficiencyStep.module.css';

interface ProficiencyStepProps {
  draft: OnboardingDraft;
  catalog: LanguageCatalogItem[];
  levelRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  onSetLevel: (code: string, level: DeclaredProficiency) => void;
}

export function ProficiencyStep({ draft, catalog, levelRefs, onSetLevel }: ProficiencyStepProps) {
  const { t, locale } = useUiLocale();
  const codes = unique([...draft.knownCodes, ...draft.learningCodes])
    .filter((code) => !draft.nativeCodes.includes(code));

  return (
    <section className={styles.levelSection} aria-labelledby='level-section-title'>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionEyebrow}>{t('onboarding.a.quick.estimate')}</p>
        <h2 id='level-section-title'>{t('onboarding.where.are.you.with.each.language')}</h2>
        <p>{t('onboarding.choose.the.level.closest.to.how.you.feel.today.there.is.no.right.or.wrong.answer')}</p>
      </div>
      {codes.length > 0 ? (
        <div className={styles.levelList}>
          {codes.map((code) => {
            const language = findLanguage(catalog, code);
            return (
              <div
                className={styles.levelItem}
                key={code}
                ref={(element) => { levelRefs.current[code] = element; }}
                role='radiogroup'
                aria-label={`${languageDisplayName(language, locale)} · ${language.nativeName}`}
                tabIndex={-1}
              >
                <div className={styles.levelLanguage}>
                  <strong>{languageDisplayName(language, locale)}</strong>
                  <span>{language.nativeName}</span>
                  <small>{draft.learningCodes.includes(code) ? t('onboarding.learning') : t('onboarding.known')}</small>
                </div>
                <div className={styles.levelOptions}>
                  {PROFICIENCY_VALUES.filter((level) => level !== 'NATIVE').map((level) => (
                    <label className={`${styles.levelOption} ${draft.levels[code] === level ? styles.levelOptionSelected : ''}`} key={level}>
                      <input
                        type='radio'
                        name={`level-${code}`}
                        value={level}
                        checked={draft.levels[code] === level}
                        onChange={() => onSetLevel(code, level)}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.nativeLevelNote}>
          <Icon name='check-circle' size={20} />  {t('onboarding.your.selected.languages.are.native.languages.so.no.additional.proficiency.is.needed')} </p>
      )}
    </section>
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

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
