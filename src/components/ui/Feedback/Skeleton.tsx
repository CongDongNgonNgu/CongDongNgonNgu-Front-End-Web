import styles from "./Feedback.module.css";

interface SkeletonProps {
  lines?: number;
  label?: string;
}

export function Skeleton({ lines = 3, label = "Đang tải nội dung" }: SkeletonProps) {
  return (
    <div className={styles.skeletonGroup} role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: lines }, (_, index) => <span key={index} className={index === 0 ? `${styles.skeletonLine} ${styles.skeletonLineWide}` : styles.skeletonLine} aria-hidden="true" />)}
    </div>
  );
}
