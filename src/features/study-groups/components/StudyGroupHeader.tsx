import type { ReactNode } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { StudyGroup } from '../study-groups.types';
import styles from './StudyGroupHeader.module.css';

export function StudyGroupHeader({ group, children }: { group: StudyGroup; children: ReactNode }) {
  const { t } = useUiLocale();
  return <header className={styles.header}>
    <div className={styles.labels}>
      <span className={styles.private}><Icon name='lock' size={16}/>{t('groups.visibility.privateInviteOnly')}</span>
      <span className={styles.role}>{t(`groups.${group.role}`)}</span>
    </div>
    <p className={styles.eyebrow}>{t('groups.learningTogether')}</p>
    <h1>{group.name}</h1>
    {group.description ? <p className={styles.description}>{group.description}</p> : null}
    <div className={styles.actions}>{children}</div>
  </header>;
}
