import type { LibraryAttributionCue, LibraryPublicProvenance } from '../library.types';
import styles from './LibraryAttributionList.module.css';

type AttributionEntry = LibraryAttributionCue | LibraryPublicProvenance;

interface LibraryAttributionListProps {
  entries: AttributionEntry[];
  detail?: boolean;
}

export function LibraryAttributionList({ entries, detail = false }: LibraryAttributionListProps) {
  return (
    <section className={styles.section} aria-labelledby={detail ? 'resource-license-heading' : undefined}>
      <div className={styles.heading}>
        <span className={styles.kicker}>Open reference</span>
        <h2 id={detail ? 'resource-license-heading' : undefined}>Nguồn và giấy phép</h2>
      </div>
      <div className={styles.list}>
        {entries.map((entry, index) => (
          <div className={styles.entry} key={`${entry.license.licenseKey}-${index}`}>
            <div>
              <p className={styles.attribution}>{entry.attribution}</p>
              <p className={styles.licenseName}>{entry.license.displayName}</p>
            </div>
            <div className={styles.licenseMeta}>
              {entry.license.attributionRequired ? <span>Ghi công bắt buộc</span> : <span>Ghi công không bắt buộc</span>}
              {entry.license.redistributionAllowed ? <span>Được phép chia sẻ</span> : <span>Không đủ điều kiện công khai</span>}
              <a href={entry.license.canonicalUrl} target='_blank' rel='noreferrer'>Xem điều khoản</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
