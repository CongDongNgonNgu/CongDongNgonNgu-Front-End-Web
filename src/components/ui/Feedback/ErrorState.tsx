import { Button } from "../Button";
import { Icon } from "../Icon/Icon";
import styles from "./Feedback.module.css";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
  retrying?: boolean;
}

export function ErrorState({ title, description, onRetry, retryLabel = "Thử lại", retrying = false }: ErrorStateProps) {
  return (
    <div className={`${styles.feedbackState} ${styles.feedbackStateError}`} role="alert">
      <span className={styles.feedbackIcon} aria-hidden="true"><Icon name="alert-circle" size={20} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Button onClick={onRetry} loading={retrying}>{retryLabel}</Button>
    </div>
  );
}
