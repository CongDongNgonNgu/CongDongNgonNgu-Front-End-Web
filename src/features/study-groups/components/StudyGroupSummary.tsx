import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { StudyGroup } from '../study-groups.types';
import styles from './StudyGroupSummary.module.css';

export function StudyGroupSummary({ group }: { group: StudyGroup }) {
  const { t } = useUiLocale();
  const destination = '/community/groups/' + encodeURIComponent(group.id);
  return <li className={styles.card}>
    <div className={styles.labels}>
      <span className={styles.role}>{t(`groups.${group.role}`)}</span>
      <span className={styles.privacy}><Icon name='lock' size={16}/>{t('groups.visibility.privateInviteOnly')}</span>
    </div>
    <h2><Link to={destination}>{group.name}</Link></h2>
    {group.description ? <p>{group.description}</p> : null}
    <Link className={styles.open} to={destination} aria-label={t('groups.openNamed', { name: group.name })}>
      {t('groups.open')}<span aria-hidden='true'>&rarr;</span>
    </Link>
  </li>;
}
