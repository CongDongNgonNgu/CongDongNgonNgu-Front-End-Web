import { useMemo } from 'react';
import { buildStructuredDiff } from '../structured-response-diff';
import styles from './StructuredResponse.module.css';

interface StructuredResponseDiffProps {
  original: string;
  corrected: string;
}
export function StructuredResponseDiff({ original, corrected }: StructuredResponseDiffProps) {
  const diff = useMemo(() => buildStructuredDiff(original, corrected), [original, corrected]);
  return (
    <section className={styles.diff} aria-label='Original and corrected text comparison'>
      <div className={styles.diffLegend} aria-live='polite'>
        <span className={styles.diffLegendItem}><del>Deleted text</del></span>
        <span className={styles.diffLegendItem}><ins>Added text</ins></span>
        <span>Unmarked text is unchanged.</span>
      </div>
      <div className={styles.diffGrid}>
        <div className={styles.diffColumn}>
          <h4>Original</h4>
          <p className={styles.diffText}>
            {diff.original.map((segment, index) => segment.kind === 'delete' ? (
              <del key={String(index) + segment.kind} className={styles.diffDeleted}>{segment.text}</del>
            ) : (
              <span key={String(index) + segment.kind}>{segment.text}</span>
            ))}
          </p>
        </div>
        <div className={styles.diffColumn}>
          <h4>Suggested correction</h4>
          <p className={styles.diffText}>
            {diff.corrected.map((segment, index) => segment.kind === 'insert' ? (
              <ins key={String(index) + segment.kind} className={styles.diffInserted}>{segment.text}</ins>
            ) : (
              <span key={String(index) + segment.kind}>{segment.text}</span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
