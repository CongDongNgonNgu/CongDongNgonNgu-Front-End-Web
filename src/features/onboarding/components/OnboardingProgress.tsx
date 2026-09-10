import { ONBOARDING_STEP_COUNT } from '../onboarding.types';
import styles from './OnboardingProgress.module.css';

interface OnboardingProgressProps {
  step: number;
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const currentStep = step + 1;
  const percent = Math.round((currentStep / ONBOARDING_STEP_COUNT) * 100);

  return (
    <>
      <div className={styles.flowTopline}>
        <div>
          <p className={styles.flowLabel}>Thiết lập hồ sơ học tập</p>
          <p className={styles.flowHint}>Một vài câu hỏi ngắn để cộng đồng hiểu bạn hơn.</p>
        </div>
        <div className={styles.progressMeta}>
          <span>Bước {currentStep}/{ONBOARDING_STEP_COUNT}</span>
          <span className={styles.progressPercent}>{percent}%</span>
        </div>
      </div>
      <div
        className={styles.progressBar}
        role='progressbar'
        aria-label='Tiến trình thiết lập hồ sơ'
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEP_COUNT}
        aria-valuenow={currentStep}
        aria-valuetext={`Bước ${currentStep} trên ${ONBOARDING_STEP_COUNT}`}
      >
        <span style={{ width: `${(currentStep / ONBOARDING_STEP_COUNT) * 100}%` }} />
      </div>
    </>
  );
}
