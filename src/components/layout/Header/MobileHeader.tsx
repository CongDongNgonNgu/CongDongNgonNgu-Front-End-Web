import { Link } from 'react-router-dom';
import { Avatar } from '../../ui/Surface';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon/Icon';
import type { MenuHandler, SearchHandler } from './header.types';
import controls from './HeaderControls.module.css';
import styles from './MobileHeader.module.css';

export function MobileHeader({ isAuthenticated, searchOpen, onSearch, onMenu }: { isAuthenticated: boolean; searchOpen: boolean; onSearch: SearchHandler; onMenu: MenuHandler }) {
  return (
    <div className={styles.mobileHeader}>
      <div className='shell-width'>
        <div className={styles.mobileHeaderInner}>
          <button className={`${controls.iconButton} ${controls.mobileCircle}`} type='button' onClick={onMenu} aria-label='Mở menu'><Icon name='menu' size={20} /></button>
          <Link className={styles.mobileBrand} to='/' aria-label='Cộng đồng ngôn ngữ, Trang chủ'>
            <img src='/brand/congdongngonngu-mark.png' alt='' width='512' height='512' />
            <span>Cộng đồng ngôn ngữ</span>
          </Link>
          <div className={styles.mobileHeaderActions}>
            <button className={`${controls.iconButton} ${controls.mobileCircle}`} type='button' onClick={onSearch} aria-label='Tìm kiếm' aria-expanded={searchOpen} aria-controls='global-search-panel'><Icon name='search' size={20} /></button>
            {isAuthenticated ? <Button variant='quiet' size='sm' className={styles.mobileAccountButton} onClick={onMenu} aria-label='NH, Tài khoản' aria-haspopup='dialog'><Avatar name='Người học' size='sm' /></Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
