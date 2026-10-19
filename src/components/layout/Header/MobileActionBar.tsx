import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../ui/Icon/Icon';
import { headerNavigation, socialNavigation, isNavigationItemActive } from '../../navigation/navigation';
import { NavigationLink } from './NavigationLink';
import type { MenuHandler, SearchHandler } from './header.types';
import styles from './MobileActionBar.module.css';

export function MobileActionBar({ isAuthenticated = false, onSearch, onMenu }: { isAuthenticated?: boolean; onSearch: SearchHandler; onMenu: MenuHandler }) {
  const { t } = useUiLocale();
  const { pathname, hash } = useLocation();
  const homeActive = isNavigationItemActive(headerNavigation[0], pathname, hash);
  return (
    <nav className={styles.mobileActionBar} data-authenticated={isAuthenticated} aria-label={t('shell.quickNavigation')}>
      <Link className={styles.mobileAction} to='/' aria-current={homeActive ? 'page' : undefined}><Icon name='home' size={20}/><span>{t('navigation.homeShort')}</span></Link>
      {isAuthenticated ? socialNavigation.map(item => <NavigationLink key={item.id} item={item} className={styles.mobileAction}/>) :
        <button className={styles.mobileAction} type='button' onClick={onSearch}><Icon name='search' size={20}/><span>{t('shell.search')}</span></button>}
      <button className={styles.mobileAction} type='button' onClick={onMenu}><Icon name='menu' size={20}/><span>{t('shell.openMenu')}</span></button>
    </nav>
  );
}
