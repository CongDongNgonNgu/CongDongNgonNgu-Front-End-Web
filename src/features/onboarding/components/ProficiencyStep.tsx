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
  const codes = unique([...draft.knownCodes, ...draft.learningCodes])
    .filter((code) => !draft.nativeCodes.includes(code));

  return (
    <section className={styles.levelSection} aria-labelledby='level-section-title'>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionEyebrow}>MỘT ƯỚC LƯỢNG NHANH</p>
        <h2 id='level-section-title'>Bạn đang ở đâu với từng ngôn ngữ?</h2>
        <p>Chọn mức gần nhất với cảm nhận hiện tại của bạn. Không có câu trả lời đúng hay sai.</p>
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
                aria-label={`${language.nativeName} · ${language.englishName}`}
                tabIndex={-1}
              >
                <div className={styles.levelLanguage}>
                  <strong>{language.nativeName}</strong>
                  <span>{language.englishName}</span>
                  <small>{draft.learningCodes.includes(code) ? 'Đang học' : 'Đã biết'}</small>
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
          <Icon name='check-circle' size={20} /> Ngôn ngữ bạn chọn đã là bản ngữ, nên không cần khai báo thêm trình độ.
        </p>
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
