import styles from './LibraryContributionStepper.module.css';

const STEPS = [
  { label: 'Loại tài nguyên', shortLabel: 'Loại' },
  { label: 'Nội dung', shortLabel: 'Nội dung' },
  { label: 'Nguồn & giấy phép', shortLabel: 'Nguồn' },
  { label: 'Xác nhận và gửi', shortLabel: 'Gửi' },
] as const;

interface LibraryContributionStepperProps {
  activeStep: number;
  onStepChange: (step: number) => void;
  disabled?: boolean;
}

export function LibraryContributionStepper({ activeStep, onStepChange, disabled = false }: LibraryContributionStepperProps) {
  return (
    <nav className={styles.stepper} aria-label='Các bước đóng góp tài nguyên'>
      <ol>
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;
          return (
            <li key={step.label} className={isActive ? styles.active : isComplete ? styles.complete : ''}>
              <button
                type='button'
                className={styles.stepButton}
                disabled={disabled || index > activeStep}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => onStepChange(index)}
              >
                <span className={styles.marker} aria-hidden='true'>{isComplete ? '✓' : index + 1}</span>
                <span className={styles.stepLabel}>
                  <span className={styles.stepLongLabel}>{step.label}</span>
                  <span className={styles.stepShortLabel}>{step.shortLabel}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
