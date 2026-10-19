import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import { Link } from 'react-router-dom';
import { Avatar } from '../../ui/Surface';
import { DropdownMenu } from '../../ui/Overlays';
import { Icon } from '../../ui/Icon/Icon';
import { additionalNavigation, headerNavigation, socialNavigation } from '../../navigation/navigation';
import type { SearchHandler } from './header.types';
import { HeaderAuthActions } from './HeaderAuthActions';
import { NavigationLink } from './NavigationLink';
import { NotificationBell } from '../../../features/notifications/NotificationBell';
import controls from './HeaderControls.module.css';
import styles from './DesktopHeader.module.css';
import { UiLocaleSelector } from './UiLocaleSelector';

interface DesktopHeaderProps {
  isAuthenticated: boolean;
  userDisplayName: string;
  onLogout?: () => Promise<void> | void;
  moreOpen: boolean;
  onMoreToggle: () => void;
  onMoreClose: () => void;
  onSearch: SearchHandler;
  searchOpen: boolean;
  onAccountToggle: () => void;
  accountOpen: boolean;
  onAccountClose: () => void;
}

export function DesktopHeader({ isAuthenticated, userDisplayName, onLogout, moreOpen, onMoreToggle, onMoreClose, onSearch, searchOpen, onAccountToggle, accountOpen, onAccountClose }: DesktopHeaderProps) {
  const { t } = useUiLocale();
  return (
    <div className={styles.desktopHeader}>
      <div className='shell-width'>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to='/'>
            <img className={styles.brandMark} src='/brand/congdongngonngu-mark.png' alt='' width='512' height='512' />
            <span className={styles.brandWordmark}><span className={styles.brandName}>{t('shell.brand')}</span><span className={styles.brandTagline}>{t('shell.tagline')}</span></span>
          </Link>
          <nav className={styles.desktopNav} aria-label={t('shell.primaryNavigation')}>
            <ul className={styles.desktopNavList}>
              {[...headerNavigation, ...(isAuthenticated ? socialNavigation : [])].map((item) => <li key={item.id}><NavigationLink item={item} short={isAuthenticated} className={styles.navLink} activeClassName={styles.navLinkActive} /></li>)}
              <li><DropdownMenu variant='navigation' open={moreOpen} label={t('shell.more')} onToggle={onMoreToggle} onClose={onMoreClose}>{additionalNavigation.map((item) => <NavigationLink key={item.id} item={item} className={styles.dropdownItem} activeClassName={styles.dropdownItemActive} onClick={onMoreClose} />)}</DropdownMenu></li>
            </ul>
          </nav>
          <div className={styles.headerActions}>
            <UiLocaleSelector compact />
            <button className={controls.iconButton} type='button' onClick={onSearch} aria-label={t('shell.search')} aria-expanded={searchOpen} aria-controls='global-search-panel'><Icon name='search' size={20} /></button>
            {isAuthenticated ? <NotificationBell /> : null}
            {isAuthenticated ? (
              <div className={styles.accountMenuWrap}>
                <DropdownMenu variant='navigation' open={accountOpen} label={t('shell.account')} onToggle={onAccountToggle} onClose={onAccountClose}
                  triggerClassName={styles.accountTrigger}
                  triggerContent={<><Avatar name={userDisplayName} size='sm' decorative /><span>{t('shell.account')}</span></>}>
                  {socialNavigation.map(item => <NavigationLink key={item.id} item={item} className={styles.dropdownItem} activeClassName={styles.dropdownItemActive}/>)}
                  <Link className={styles.dropdownItem} to='/profile'><Icon name='user-round' size={18}/>{t('shell.passport')}</Link>
                  <Link className={styles.dropdownItem} to='/membership'><Icon name='award' size={18}/>{t('shell.membership')}</Link>
                </DropdownMenu>
              </div>
            ) : null}
            <HeaderAuthActions isAuthenticated={isAuthenticated} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </div>
  );
}
