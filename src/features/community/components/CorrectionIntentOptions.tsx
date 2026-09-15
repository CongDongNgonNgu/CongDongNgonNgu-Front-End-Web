import {
  CORRECTION_INTENTS,
  CORRECTION_INTENT_HELP,
  CORRECTION_INTENT_LABELS,
  type CorrectionIntent,
} from '../corrections.types';
import styles from '../pages/CommunityRequestPage.module.css';

interface CorrectionIntentOptionsProps {
  value: string;
  error?: string;
  onChange: (value: CorrectionIntent) => void;
}

export function CorrectionIntentOptions({ value, error, onChange }: CorrectionIntentOptionsProps) {
  return (
    <fieldset
      className={styles.intentFieldset}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? 'correction-intent-error' : undefined}
    >
      <legend>
        Bạn muốn cộng đồng giúp điều gì? <span aria-hidden='true'>*</span>
      </legend>
      <p className={styles.fieldHint}>Chọn một mục tiêu để người trả lời tập trung đúng vào điều bạn cần.</p>
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
              <strong>{CORRECTION_INTENT_LABELS[intent]}</strong>
              <small>{CORRECTION_INTENT_HELP[intent]}</small>
            </span>
          </label>
        ))}
      </div>
      {error ? <p id='correction-intent-error' className={styles.fieldError} role='alert'>{error}</p> : null}
    </fieldset>
  );
}
