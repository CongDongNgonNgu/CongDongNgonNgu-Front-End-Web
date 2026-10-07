import { Button } from "../Button";
import { Icon } from "../Icon/Icon";
import styles from "./Feedback.module.css";
import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
  retrying?: boolean;
}

export function ErrorState({ title, description, onRetry, retryLabel, retrying = false }: ErrorStateProps) {
  const { t } = useUiLocale();
  return (
    <div className={`${styles.feedbackState} ${styles.feedbackStateError}`} role="alert">
      <span className={styles.feedbackIcon} aria-hidden="true"><Icon name="alert-circle" size={20} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button onClick={onRetry} loading={retrying}>{retryLabel ?? t('common.retry')}</Button>
    </div>
  );
}
