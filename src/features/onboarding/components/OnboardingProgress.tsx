import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { ONBOARDING_STEP_COUNT } from '../onboarding.types';
import styles from './OnboardingProgress.module.css';

interface OnboardingProgressProps {
  step: number;
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const { t, locale } = useUiLocale();
  const currentStep = step + 1;
  const percent = Math.round((currentStep / ONBOARDING_STEP_COUNT) * 100);

  return (
    <>
      <div className={styles.flowTopline}>
        <div>
          <p className={styles.flowLabel}>{t('onboarding.set.up.your.learning.profile')}</p>
          <p className={styles.flowHint}>{t('onboarding.a.few.short.questions.to.help.the.community.get.to.know.you')}</p>
        </div>
        <div className={styles.progressMeta}>
          <span>{t('onboarding.step')} {currentStep}/{ONBOARDING_STEP_COUNT}</span>
          <span className={styles.progressPercent}>{percent}%</span>
        </div>
      </div>
      <div
        className={styles.progressBar}
        role='progressbar'
        aria-label={t('onboarding.profile.setup.progress')}
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEP_COUNT}
        aria-valuenow={currentStep}
        aria-valuetext={t('onboarding.step.count', { step: currentStep, total: ONBOARDING_STEP_COUNT })}
      >
        <span style={{ width: `${(currentStep / ONBOARDING_STEP_COUNT) * 100}%` }} />
      </div>
    </>
  );
}
