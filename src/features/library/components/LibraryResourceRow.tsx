import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/ui/Icon/Icon';
import type { LibraryPublicSearchItem, LibraryResourceType } from '../library.types';
import styles from './LibraryResourceRow.module.css';

const resourceTypeLabels: Record<LibraryResourceType, string> = {
  VOCABULARY: 'Từ vựng',
  SENTENCE: 'Câu mẫu',
  TRANSLATION: 'Bản dịch',
  GRAMMAR_ITEM: 'Ngữ pháp',
  DIALOGUE: 'Hội thoại',
  IDIOM: 'Thành ngữ',
  SLANG: 'Tiếng lóng',
  CULTURAL_NOTE: 'Văn hoá',
  PRONUNCIATION: 'Phát âm',
  LEARNING_COLLECTION: 'Bộ sưu tập',
};

const resourceTypeIcons: Record<LibraryResourceType, IconName> = {
  VOCABULARY: 'book-open',
  SENTENCE: 'message-circle',
  TRANSLATION: 'arrow-left-right',
  GRAMMAR_ITEM: 'languages',
  DIALOGUE: 'users',
  IDIOM: 'sparkles',
  SLANG: 'message-circle',
  CULTURAL_NOTE: 'globe',
  PRONUNCIATION: 'loader-circle',
  LEARNING_COLLECTION: 'library',
};

interface LibraryResourceRowProps {
  item: LibraryPublicSearchItem;
}

export function LibraryResourceRow({ item }: LibraryResourceRowProps) {
  const primaryCue = item.provenance[0];
  return (
    <Link className={styles.row} to={`/library/${encodeURIComponent(item.id)}`}>
      <span className={styles.icon} aria-hidden='true'><Icon name={resourceTypeIcons[item.resourceType]} size={20} /></span>
      <span className={styles.body}>
        <span className={styles.overline}>
          <span>{resourceTypeLabels[item.resourceType]}</span>
          <span className={styles.verified}><Icon name='check-circle' size={16} /> Đã xác minh</span>
        </span>
        <span className={styles.title}>{item.preview.title}</span>
        <span className={styles.excerpt}>{item.preview.excerpt}</span>
        <span className={styles.meta}>
          <span>{item.primaryLanguageCode.toUpperCase()}{item.secondaryLanguageCode ? ` · ${item.secondaryLanguageCode.toUpperCase()}` : ''}</span>
          {item.cefrLevel ? <span>{item.cefrLevel}</span> : null}
          {item.topics.slice(0, 2).map((topic) => <span key={topic}>#{topic}</span>)}
        </span>
      </span>
      <span className={styles.attribution}>
        <span>{primaryCue?.license.displayName ?? 'License verified'}</span>
        {primaryCue?.license.attributionRequired ? <span>Ghi công bắt buộc</span> : <span>Được phép chia sẻ</span>}
        <span aria-hidden='true'>→</span>
      </span>
    </Link>
  );
}
