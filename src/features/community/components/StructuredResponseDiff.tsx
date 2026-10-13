import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useMemo } from 'react';
import { buildStructuredDiff } from '../structured-response-diff';
import styles from './StructuredResponse.module.css';

interface StructuredResponseDiffProps {
  original: string;
  corrected: string;
}
export function StructuredResponseDiff({ original, corrected }: StructuredResponseDiffProps) {
  const { t } = useUiLocale();
  const diff = useMemo(() => buildStructuredDiff(original, corrected), [original, corrected]);
  return (
    <section className={styles.diff} aria-label={t('community.detail.original.and.corrected.text.comparison')}>
      <div className={styles.diffLegend} aria-live='polite'>
        <span className={styles.diffLegendItem}><del>{t('community.detail.deleted.text')}</del></span>
        <span className={styles.diffLegendItem}><ins>{t('community.detail.added.text')}</ins></span>
        <span>{t('community.detail.unmarked.text.is.unchanged')}</span>
      </div>
      <div className={styles.diffGrid}>
        <div className={styles.diffColumn}>
          <h4>{t('community.detail.original')}</h4>
          <p className={styles.diffText}>
            {diff.original.map((segment, index) => segment.kind === 'delete' ? (
              <del key={String(index) + segment.kind} className={styles.diffDeleted}>{segment.text}</del>
            ) : (
              <span key={String(index) + segment.kind}>{segment.text}</span>
            ))}
          </p>
        </div>
        <div className={styles.diffColumn}>
          <h4>{t('community.detail.suggested.correction.heading')}</h4>
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
