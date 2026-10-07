import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/ui/Icon/Icon';
import type { LibraryPublicSearchItem, LibraryResourceType } from '../library.types';
import { resourceTypeLabelKeys, contentLanguage } from '../library.presentation';
import styles from './LibraryResourceRow.module.css';


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
  const { t } = useUiLocale();
  const primaryCue = item.provenance[0];
  return (
    <Link className={styles.row} to={`/library/${encodeURIComponent(item.id)}`}>
      <span className={styles.icon} aria-hidden='true'><Icon name={resourceTypeIcons[item.resourceType]} size={20} /></span>
      <span className={styles.body}>
        <span className={styles.overline}>
          <span>{t(resourceTypeLabelKeys[item.resourceType])}</span>
          <span className={styles.verified}><Icon name='check-circle' size={16} /> {t('library.verified')}</span>
        </span>
        <span className={styles.title} lang={contentLanguage(item.primaryLanguageCode)} dir='auto'>{item.preview.title}</span>
        <span className={styles.excerpt} dir='auto'>{item.preview.excerpt}</span>
        <span className={styles.meta}>
          <span>{item.primaryLanguageCode.toUpperCase()}{item.secondaryLanguageCode ? ` · ${item.secondaryLanguageCode.toUpperCase()}` : ''}</span>
          {item.cefrLevel ? <span>{item.cefrLevel}</span> : null}
          {item.topics.slice(0, 2).map((topic) => <span key={topic}>#{topic}</span>)}
        </span>
      </span>
      <span className={styles.attribution}>
        <span>{primaryCue?.license.displayName ?? t('library.licenseVerified')}</span>
        {primaryCue?.license.attributionRequired ? <span>{t('library.attributionRequired')}</span> : <span>{t('library.sharingAllowed')}</span>}
        <span aria-hidden='true'>→</span>
      </span>
    </Link>
  );
}
