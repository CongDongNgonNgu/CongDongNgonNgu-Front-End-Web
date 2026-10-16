import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { COMMUNITY_POST_TYPE_LABELS_KEYS } from '../community.constants';
import type { CommunityPostType } from '../community.types';
import styles from './CommunityPostTypeBadge.module.css';

export function CommunityPostTypeBadge({ type }: { type: CommunityPostType }) {
  const { t } = useUiLocale();
  return <span className={styles.badge}>{t(COMMUNITY_POST_TYPE_LABELS_KEYS[type])}</span>;
}
