import { Icon, type IconName } from "../Icon/Icon";
import styles from "./Feedback.module.css";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: IconName;
}

export function EmptyState({ title, description, icon = "inbox" }: EmptyStateProps) {
  return (
    <div className={`${styles.feedbackState} ${styles.feedbackStateEmpty}`} role="status">
      <span className={styles.feedbackIcon} aria-hidden="true"><Icon name={icon} size={20} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
