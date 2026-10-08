import { useUiLocale } from '../ui-locale/UiLocaleProvider';
import styles from './RecoveryStatusRail.module.css';

const steps = [
  "auth.n1.request",
  "auth.n2.sent",
  "auth.n3.reset.password",
  "auth.n4.expired.link",
  "auth.n5.complete",
] as const;

interface RecoveryStatusRailProps {
  activeStep: number;
}

export function RecoveryStatusRail({ activeStep }: RecoveryStatusRailProps) {
  const { t } = useUiLocale();
  return (
    <div className={styles.recoveryRail} aria-label={t("auth.password.recovery.status")}>
      <div className={styles.recoveryRailHeader}>
        <span>{t("auth.preview.status")}</span>
        <span>{t('auth.recovery.step', { step: activeStep })}</span>
      </div>
      <ol className={styles.recoveryTabs} tabIndex={0} aria-label={t("auth.password.recovery.status")}>
        {steps.map((step, index) => (
          <li className={index + 1 === activeStep ? styles.recoveryTabActive : styles.recoveryTab} key={step}>
            {t(step)}
          </li>
        ))}
      </ol>
    </div>
  );
}
