import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '../../ui/Overlays';
import { Icon } from '../../ui/Icon/Icon';
import { additionalNavigation } from '../../navigation/navigation';
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
        <Link className={`${styles.drawerNavItem} ${styles.drawerNavItemActive}`} to='/' onClick={onClose}><Icon name='home' size={20} /><span>Trang chủ</span></Link>
        {additionalNavigation.map((item) => <NavigationLink key={item.id} item={item} className={styles.drawerNavItem} onClick={onClose} />)}
      </nav>
      <div className={styles.drawerAuth} aria-label='Tài khoản'>
        {isAuthenticated ? (
          <button className={styles.drawerAuthButton} type='button' onClick={() => { onClose(); runLogout(onLogout); }}>Đăng xuất</button>
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
