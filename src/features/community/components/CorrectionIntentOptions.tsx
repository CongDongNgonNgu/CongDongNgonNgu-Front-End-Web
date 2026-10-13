import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import {
  CORRECTION_INTENTS,
  CORRECTION_INTENT_HELP_KEYS,
  CORRECTION_INTENT_LABELS_KEYS,
  type CorrectionIntent,
} from '../corrections.types';
import styles from '../pages/CommunityRequestPage.module.css';

interface CorrectionIntentOptionsProps {
  value: string;
  error?: string;
  onChange: (value: CorrectionIntent) => void;
}

export function CorrectionIntentOptions({ value, error, onChange }: CorrectionIntentOptionsProps) {
  const { t } = useUiLocale();
  return (
    <fieldset
      className={styles.intentFieldset}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? 'correction-intent-error' : undefined}
    >
      <legend>
        {t("community.posts.what.would.you.like.help.with")}<span aria-hidden='true'>*</span>
      </legend>
      <p className={styles.fieldHint}>{t("community.posts.choose.a.goal.to.help.contributors.focus.on")}</p>
      <div className={styles.intentOptions}>
        {CORRECTION_INTENTS.map((intent) => (
          <label
            key={intent}
            className={[styles.intentOption, value === intent ? styles.intentOptionSelected : ''].filter(Boolean).join(' ')}
          >
            <input
              type='radio'
              name='correction-intent'
              value={intent}
              checked={value === intent}
              onChange={() => onChange(intent)}
            />
            <span className={styles.intentCopy}>
              <strong>{t(CORRECTION_INTENT_LABELS_KEYS[intent])}</strong>
              <small>{t(CORRECTION_INTENT_HELP_KEYS[intent])}</small>
            </span>
          </label>
        ))}
      </div>
      {error ? <p id='correction-intent-error' className={styles.fieldError} role='alert'>{error}</p> : null}
    </fieldset>
  );
}
