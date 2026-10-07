import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { LibraryAttributionCue, LibraryPublicProvenance } from '../library.types';
import styles from './LibraryAttributionList.module.css';

type AttributionEntry = LibraryAttributionCue | LibraryPublicProvenance;

interface LibraryAttributionListProps {
  entries: AttributionEntry[];
  detail?: boolean;
}

export function LibraryAttributionList({ entries, detail = false }: LibraryAttributionListProps) {
  const { t } = useUiLocale();
  return (
    <section className={styles.section} aria-labelledby={detail ? 'resource-license-heading' : undefined}>
      <div className={styles.heading}>
        <span className={styles.kicker}>{t('library.attributionEyebrow')}</span>
        <h2 id={detail ? 'resource-license-heading' : undefined}>{t('library.sources')}</h2>
      </div>
      <div className={styles.list}>
        {entries.map((entry, index) => (
          <div className={styles.entry} key={`${entry.license.licenseKey}-${index}`}>
            <div>
              <p className={styles.attribution}>{entry.attribution}</p>
              <p className={styles.licenseName}>{entry.license.displayName}</p>
            </div>
            <div className={styles.licenseMeta}>
              {entry.license.attributionRequired ? <span>{t('library.attributionRequired')}</span> : <span>{t('library.attributionOptional')}</span>}
              {entry.license.redistributionAllowed ? <span>{t('library.sharingAllowed')}</span> : <span>{t('library.publicIneligible')}</span>}
              {'sourceUrl' in entry && safeExternalUrl(entry.sourceUrl) ? <a href={safeExternalUrl(entry.sourceUrl)!} target='_blank' rel='noreferrer'>{t('library.originalSource')}</a> : null}
              <a href={entry.license.canonicalUrl} target='_blank' rel='noreferrer'>{t('library.licenseTerms')}</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
