import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { Icon } from '../../../components/ui/Icon/Icon';
import { ONBOARDING_STEP_COUNT } from '../onboarding.types';
import styles from './OnboardingStepHeader.module.css';

interface OnboardingStepHeaderProps {
  step: number;
  eyebrow: string;
  title: string;
  description: string;
}

export function OnboardingStepHeader({ step, eyebrow, title, description }: OnboardingStepHeaderProps) {
  const { t, locale } = useUiLocale();
  return (
    <header className={styles.stepHeader}>
      <p className={styles.kicker}>
         {t('onboarding.step.title')} {step + 1}  {t('onboarding.of')} {ONBOARDING_STEP_COUNT} <span aria-hidden='true'>•</span> {eyebrow.toUpperCase()}
      </p>
      <h1 id='onboarding-title'>{title}</h1>
      <p>{description}</p>
      <p className={styles.reassurance}>
        <Icon name='lock' size={16} />  {t('onboarding.you.can.edit.these.at.any.time.in.settings')} </p>
    </header>
  );
}
