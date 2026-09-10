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
  return (
    <header className={styles.stepHeader}>
      <p className={styles.kicker}>
        BƯỚC {step + 1} TRÊN {ONBOARDING_STEP_COUNT} <span aria-hidden='true'>•</span> {eyebrow.toUpperCase()}
      </p>
      <h1 id='onboarding-title'>{title}</h1>
      <p>{description}</p>
      <p className={styles.reassurance}>
        <Icon name='lock' size={16} /> Bạn có thể chỉnh sửa sau bất kỳ lúc nào trong cài đặt.
      </p>
    </header>
  );
}
