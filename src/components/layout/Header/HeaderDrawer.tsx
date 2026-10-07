import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '../../ui/Overlays';
import { additionalNavigation, headerNavigation } from '../../navigation/navigation';
import { NavigationLink } from './NavigationLink';
import { runLogout } from './header.utils';
import styles from './HeaderDrawer.module.css';
import { UiLocaleSelector } from './UiLocaleSelector';

interface HeaderDrawerProps {
  open: boolean;
  isAuthenticated: boolean;
  onLogout?: () => Promise<void> | void;
  onClose: () => void;
  initialFocusRef: RefObject<HTMLButtonElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function HeaderDrawer({ open, isAuthenticated, onLogout, onClose, initialFocusRef, returnFocusRef }: HeaderDrawerProps) {
  const { t } = useUiLocale();
  return (
    <Drawer
      open={open}
      title={t('shell.menu')}
      closeLabel={t('shell.closeMenu')}
      navigationLabel={t('shell.navigation')}
      onClose={onClose}
      initialFocusRef={initialFocusRef as RefObject<HTMLElement>}
      returnFocusRef={returnFocusRef as RefObject<HTMLElement>}
    >
      <nav className={styles.drawerNav} aria-label={t('shell.mobileNavigation')}>
        <NavigationLink item={headerNavigation[0]} short iconName='home' className={styles.drawerNavItem} activeClassName={styles.drawerNavItemActive} onClick={onClose} />
        {headerNavigation.filter((item) => item.id !== 'home').map((item) => <NavigationLink key={item.id} item={item} className={styles.drawerNavItem} activeClassName={styles.drawerNavItemActive} onClick={onClose} />)}
        {additionalNavigation.map((item) => <NavigationLink key={item.id} item={item} className={styles.drawerNavItem} activeClassName={styles.drawerNavItemActive} onClick={onClose} />)}
      </nav>
      <UiLocaleSelector />
      <div className={styles.drawerAuth} aria-label={t('shell.account')}>
        {isAuthenticated ? (
          <>
            <Link className={styles.drawerAuthButton} to='/profile' onClick={onClose}>{t('shell.passport')}</Link>
            <Link className={styles.drawerAuthButton} to='/membership' onClick={onClose}>{t('shell.membership')}</Link>
            <button className={styles.drawerAuthButton} type='button' onClick={() => { onClose(); runLogout(onLogout); }}>{t('shell.logout')}</button>
          </>
        ) : (
          <>
            <Link className={styles.drawerAuthButton} to='/login' onClick={onClose}>{t('shell.login')}</Link>
            <Link className={styles.drawerAuthButtonPrimary} to='/register' onClick={onClose}>{t('shell.register')}</Link>
          </>
        )}
      </div>
    </Drawer>
  );
}
