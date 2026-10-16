import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { Button } from '../../../components/ui/Button';
import type { CorrectionRequestSource } from '../hooks/useCorrectionRequestSource';
import { CommunityDisclosure } from './CommunityDisclosure';
import styles from './CorrectionRequestOriginal.module.css';

export function CorrectionRequestOriginal({ source, content, direction }: { source: CorrectionRequestSource; content: string; direction: 'ltr' | 'rtl' }) {
  const { t } = useUiLocale();
  if (source.loading) return <p role='status'>{t('community.detail.loading.responses')}</p>;
  if (source.error || !source.data) return <div role='alert'><p>{t('community.detail.could.not.load.responses')}</p><Button variant='secondary' onClick={source.retry}>{t('community.detail.try.again')}</Button></div>;
  const { originalText, context } = source.data.correction;
  const hasIndependentNote = content !== originalText && content !== context;
  return <section className={styles.source} aria-label={t('community.detail.original.for.review')}>
    <p className={styles.label}>{t('community.detail.original.for.review')}</p>
    <p className={styles.original} dir={direction}>{originalText}</p>
    {context && context !== originalText ? <div className={styles.context}><p className={styles.label}>{t('community.correction.context')}</p><p dir={direction}>{context}</p></div> : null}
    {hasIndependentNote ? <CommunityDisclosure title={t('community.correction.note')} className={styles.note}><p dir={direction}>{content}</p></CommunityDisclosure> : null}
  </section>;
}
