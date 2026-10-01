import { Link } from 'react-router-dom';
import { Avatar } from '../../ui/Surface';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon/Icon';
import { useOptionalNotificationCenter } from '../../../features/notifications/NotificationCenterProvider';
import type { MenuHandler, SearchHandler } from './header.types';
import controls from './HeaderControls.module.css';
import styles from './MobileHeader.module.css';

export function MobileHeader({ isAuthenticated, userDisplayName, searchOpen, onSearch, onMenu }: { isAuthenticated: boolean; userDisplayName: string; searchOpen: boolean; onSearch: SearchHandler; onMenu: MenuHandler }) {
  const notificationCenter = useOptionalNotificationCenter();
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
            {isAuthenticated && notificationCenter?.active ? (
              <Link className={styles.notificationLink} to='/notifications' aria-label={notificationCenter.unreadCount ? `Thông báo, ${notificationCenter.unreadCount} chưa đọc` : 'Thông báo'}>
                <Icon name='bell' size={20} />
                {notificationCenter.unreadCount ? <span className={styles.notificationBadge} aria-hidden='true'>{notificationCenter.unreadCount > 99 ? '99+' : notificationCenter.unreadCount}</span> : null}
              </Link>
            ) : null}
            <button className={`${controls.iconButton} ${controls.mobileCircle}`} type='button' onClick={onSearch} aria-label='Tìm kiếm' aria-expanded={searchOpen} aria-controls='global-search-panel'><Icon name='search' size={20} /></button>
            {isAuthenticated ? <Button variant='quiet' size='sm' className={styles.mobileAccountButton} onClick={onMenu} aria-label={`Tài khoản của ${userDisplayName}`} aria-haspopup='dialog'><Avatar name={userDisplayName} size='sm' decorative /></Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
