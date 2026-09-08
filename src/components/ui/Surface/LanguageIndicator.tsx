import styles from "./LanguageIndicator.module.css";

interface LanguageIndicatorProps {
  language: string;
  level?: string;
}

export function LanguageIndicator({ language, level }: LanguageIndicatorProps) {
  return (
    <span className={styles.indicator}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{language}</span>
      {level ? <span className={styles.level}>{level}</span> : null}
    </span>
  );
}
