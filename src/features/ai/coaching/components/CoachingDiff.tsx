import { useMemo } from 'react';
import { buildStructuredDiff } from '../../../community/structured-response-diff';
import styles from './CoachingDiff.module.css';

interface CoachingDiffProps {
  original: string;
  corrected: string;
  label?: string;
}

export function CoachingDiff({ original, corrected, label = 'So sánh bản gốc và đề xuất' }: CoachingDiffProps) {
  const diff = useMemo(() => buildStructuredDiff(original, corrected), [original, corrected]);
  return (
    <section className={styles.diff} aria-label={label}>
      <div className={styles.legend} aria-live='polite'>
        <span><del>Phần được thay thế</del></span>
        <span><ins>Phần được thêm</ins></span>
        <span>Phần không đánh dấu được giữ nguyên.</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.column}>
          <h4>Văn bản gốc</h4>
          <p className={styles.text}>
            {diff.original.map((segment, index) => segment.kind === 'delete' ? (
              <del key={`${index}-${segment.kind}`} className={styles.deleted}>{segment.text}</del>
            ) : <span key={`${index}-${segment.kind}`}>{segment.text}</span>)}
          </p>
        </div>
        <div className={styles.column}>
          <h4>Đề xuất</h4>
          <p className={styles.text}>
            {diff.corrected.map((segment, index) => segment.kind === 'insert' ? (
              <ins key={`${index}-${segment.kind}`} className={styles.inserted}>{segment.text}</ins>
            ) : <span key={`${index}-${segment.kind}`}>{segment.text}</span>)}
          </p>
        </div>
      </div>
    </section>
  );
}
