import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import styles from './CommunitySocialNavigation.module.css';

export function CommunitySocialNavigation() {
  const { t } = useUiLocale();
  return <nav className={styles.navigation} aria-label={t('shell.socialNavigation')}>
    <Link className={styles.entry} to='/community/groups' aria-label={t('navigation.groups')}>
      <Icon name='users' size={20}/>
      <span><strong>{t('navigation.groups')}</strong><span>{t('shell.socialGroupsHelp')}</span></span>
    </Link>
    <Link className={styles.entry} to='/exchange/conversations' aria-label={t('navigation.messages')}>
      <Icon name='message-circle' size={20}/>
      <span><strong>{t('navigation.messages')}</strong><span>{t('shell.socialMessagesHelp')}</span></span>
    </Link>
  </nav>;
}
