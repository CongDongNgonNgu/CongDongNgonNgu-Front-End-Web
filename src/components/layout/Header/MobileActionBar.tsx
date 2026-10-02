import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../ui/Icon/Icon';
import { headerNavigation, isNavigationItemActive } from '../../navigation/navigation';
import type { MenuHandler, SearchHandler } from './header.types';
import styles from './MobileActionBar.module.css';

export function MobileActionBar({ onSearch, onMenu }: { onSearch: SearchHandler; onMenu: MenuHandler }) {
  const { pathname, hash } = useLocation();
  const homeActive = isNavigationItemActive(headerNavigation[0], pathname, hash);
  return (
    <nav className={styles.mobileActionBar} aria-label='Điều hướng nhanh'>
      <Link className={styles.mobileAction} to='/' aria-current={homeActive ? 'page' : undefined}><Icon name='home' size={20} /><span>Trang chủ</span></Link>
      <button className={styles.mobileAction} type='button' onClick={onSearch}><Icon name='search' size={20} /><span>Tìm kiếm</span></button>
      <button className={styles.mobileAction} type='button' onClick={onMenu}><Icon name='menu' size={20} /><span>Mở menu</span></button>
    </nav>
  );
}
