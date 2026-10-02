import type { RefObject } from 'react';
import { Drawer } from '../../ui/Overlays';
import { additionalNavigation, headerNavigation } from '../../navigation/navigation';
import { NavigationLink } from './NavigationLink';
import { runLogout } from './header.utils';
import styles from './HeaderDrawer.module.css';

interface HeaderDrawerProps {
  open: boolean;
  isAuthenticated: boolean;
  onLogout?: () => Promise<void> | void;
  onClose: () => void;
  initialFocusRef: RefObject<HTMLButtonElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function HeaderDrawer({ open, isAuthenticated, onLogout, onClose, initialFocusRef, returnFocusRef }: HeaderDrawerProps) {
  return (
    <Drawer
      open={open}
      title='Menu'
      onClose={onClose}
      initialFocusRef={initialFocusRef as RefObject<HTMLElement>}
      returnFocusRef={returnFocusRef as RefObject<HTMLElement>}
    >
      <nav className={styles.drawerNav} aria-label='Điều hướng menu di động'>
        <NavigationLink item={headerNavigation[0]} label={headerNavigation[0].shortLabel} iconName='home' className={styles.drawerNavItem} activeClassName={styles.drawerNavItemActive} onClick={onClose} />
        {headerNavigation.filter((item) => item.id !== 'home').map((item) => <NavigationLink key={item.id} item={item} className={styles.drawerNavItem} activeClassName={styles.drawerNavItemActive} onClick={onClose} />)}
        {additionalNavigation.map((item) => <NavigationLink key={item.id} item={item} className={styles.drawerNavItem} activeClassName={styles.drawerNavItemActive} onClick={onClose} />)}
      </nav>
      <div className={styles.drawerAuth} aria-label='Tài khoản'>
        {isAuthenticated ? (
          <>
            <Link className={styles.drawerAuthButton} to='/profile' onClick={onClose}>Hộ chiếu ngôn ngữ</Link>
            <Link className={styles.drawerAuthButton} to='/membership' onClick={onClose}>Membership</Link>
            <button className={styles.drawerAuthButton} type='button' onClick={() => { onClose(); runLogout(onLogout); }}>Đăng xuất</button>
          </>
        ) : (
          <>
            <Link className={styles.drawerAuthButton} to='/login' onClick={onClose}>Đăng nhập</Link>
            <Link className={styles.drawerAuthButtonPrimary} to='/register' onClick={onClose}>Đăng ký</Link>
          </>
        )}
      </div>
    </Drawer>
  );
}
