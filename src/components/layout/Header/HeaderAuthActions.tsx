import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import { Link } from 'react-router-dom';
import { runLogout } from './header.utils';
import styles from './HeaderAuthActions.module.css';

export function HeaderAuthActions({ isAuthenticated, onLogout }: { isAuthenticated: boolean; onLogout?: () => Promise<void> | void }) {
  const { t } = useUiLocale();
  if (isAuthenticated) {
    return <button className={styles.headerAuthLink} type='button' onClick={() => runLogout(onLogout)}>{t('shell.logout')}</button>;
  }
  return (
    <div className={styles.headerAuthLinks}>
      <Link className={styles.headerAuthLink} to='/login'>{t('shell.login')}</Link>
      <Link className={styles.headerAuthLinkPrimary} to='/register'>{t('shell.register')}</Link>
    </div>
  );
}
