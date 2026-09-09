import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../ui/Icon/Icon";
import { Avatar } from "../../ui/Surface";
import { Button } from "../../ui/Button";
import { Drawer, DropdownMenu } from "../../ui/Overlays";
import { SearchField } from "../../ui/Feedback";
import { additionalNavigation, headerNavigation, type NavigationItem } from "../../navigation/navigation";
import styles from "./Header.module.css";

interface HeaderProps {
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void> | void;
}

type SearchHandler = (event?: MouseEvent<HTMLButtonElement>) => void;
type MenuHandler = (event: MouseEvent<HTMLButtonElement>) => void;

function NavigationLink({ item, className, onClick }: { item: NavigationItem; className?: string; onClick?: () => void }) {
  if (!item.href) return null;
  const content = <><Icon name={item.icon} size={18} /><span>{item.label}</span></>;
  if (item.href.startsWith("#")) return <a className={className} href={item.href} onClick={onClick}>{content}</a>;
  return <Link className={className} to={item.href} onClick={onClick} aria-current={item.id === "home" ? "page" : undefined}>{content}</Link>;
}

function DesktopHeader({
  isAuthenticated,
  onLogout,
  moreOpen,
  onMoreToggle,
  onSearch,
  searchOpen,
  onAccountToggle,
  accountOpen,
}: {
  isAuthenticated: boolean;
  onLogout?: () => Promise<void> | void;
  moreOpen: boolean;
  onMoreToggle: () => void;
  onSearch: SearchHandler;
  searchOpen: boolean;
  onAccountToggle: () => void;
  accountOpen: boolean;
}) {
  return (
    <div className={styles.desktopHeader}>
      <div className="shell-width">
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/">
            <img className={styles.brandMark} src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
            <span className={styles.brandWordmark}>
              <span className={styles.brandName}>Cộng đồng ngôn ngữ</span>
              <span className={styles.brandTagline}>Học cùng nhau, từ mọi nơi</span>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label="Điều hướng chính">
            <ul className={styles.desktopNavList}>
              {headerNavigation.map((item) => <li key={item.id}><NavigationLink item={item} className={styles.navLinkActive} /></li>)}
              <li>
                <DropdownMenu open={moreOpen} label="Thêm" onToggle={onMoreToggle}>
                  {additionalNavigation.map((item) => <NavigationLink key={item.id} item={item} className={styles.dropdownItem} />)}
                </DropdownMenu>
              </li>
            </ul>
          </nav>

          <div className={styles.headerActions}>
            <button className={styles.iconButton} type="button" onClick={onSearch} aria-label="Tìm kiếm" aria-expanded={searchOpen} aria-controls="global-search-panel">
              <Icon name="search" size={20} />
            </button>
            {isAuthenticated ? (
              <div className={styles.accountMenuWrap}>
                <button className={styles.accountTrigger} type="button" onClick={onAccountToggle} aria-haspopup="menu" aria-expanded={accountOpen}>
                  <Avatar name="Người học" size="sm" /><span>Tài khoản</span>
                </button>
                {accountOpen ? <div className={styles.accountMenu} role="menu" aria-label="Tài khoản"><span className={styles.dropdownItem} role="menuitem"><Icon name="user-round" size={18} />Người học</span></div> : null}
              </div>
            ) : null}
            <HeaderAuthActions isAuthenticated={isAuthenticated} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileHeader({ isAuthenticated, searchOpen, onSearch, onMenu }: { isAuthenticated: boolean; searchOpen: boolean; onSearch: SearchHandler; onMenu: MenuHandler }) {
  return (
    <div className={styles.mobileHeader}>
      <div className="shell-width">
        <div className={styles.mobileHeaderInner}>
          <button className={styles.iconButton} type="button" onClick={onMenu} aria-label="Mở menu"><Icon name="menu" size={20} /></button>
          <Link className={styles.mobileBrand} to="/" aria-label="Cộng đồng ngôn ngữ, Trang chủ">
            <img src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
            <span>Cộng đồng ngôn ngữ</span>
          </Link>
          <div className={styles.mobileHeaderActions}>
            <button className={styles.iconButton} type="button" onClick={onSearch} aria-label="Tìm kiếm" aria-expanded={searchOpen} aria-controls="global-search-panel"><Icon name="search" size={20} /></button>
            {isAuthenticated ? <Button variant="quiet" size="sm" className={styles.mobileAccountButton} onClick={onMenu} aria-label="Tài khoản" aria-haspopup="dialog"><Avatar name="Người học" size="sm" /></Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileActionBar({ onSearch, onMenu }: { onSearch: SearchHandler; onMenu: MenuHandler }) {
  return (
    <nav className={styles.mobileActionBar} aria-label="Điều hướng nhanh">
      <Link className={styles.mobileAction} to="/" aria-current="page"><Icon name="home" size={20} /><span>Trang chủ</span></Link>
      <button className={styles.mobileAction} type="button" onClick={onSearch}><Icon name="search" size={20} /><span>Tìm kiếm</span></button>
      <button className={styles.mobileAction} type="button" onClick={onMenu}><Icon name="menu" size={20} /><span>Mở menu</span></button>
    </nav>
  );
}

export function Header({ isAuthenticated = false, onLogout }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchAnnouncement, setSearchAnnouncement] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    menuButtonRef.current = event.currentTarget;
    setDrawerOpen(true);
    setMoreOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
  }, []);
  const toggleMore = useCallback(() => {
    setMoreOpen((open) => !open);
    setAccountOpen(false);
  }, []);
  const toggleAccount = useCallback(() => {
    setAccountOpen((open) => !open);
    setMoreOpen(false);
  }, []);
  const openSearch = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    if (event) searchTriggerRef.current = event.currentTarget;
    setSearchOpen(true);
    setSearchAnnouncement("");
    setMoreOpen(false);
    setAccountOpen(false);
    setDrawerOpen(false);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const submitSearch = useCallback(() => {
    const value = searchValue.trim();
    setSearchAnnouncement(value ? `Đã nhận từ khóa “${value}”.` : "Nhập một từ khóa để bắt đầu.");
  }, [searchValue]);

  useEffect(() => {
    if (!searchOpen) {
      searchTriggerRef.current?.focus();
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, searchOpen]);

  return (
    <header className={styles.siteHeader} role="banner">
      <DesktopHeader isAuthenticated={isAuthenticated} onLogout={onLogout} moreOpen={moreOpen} onMoreToggle={toggleMore} onSearch={openSearch} searchOpen={searchOpen} onAccountToggle={toggleAccount} accountOpen={accountOpen} />
      <MobileHeader isAuthenticated={isAuthenticated} searchOpen={searchOpen} onSearch={openSearch} onMenu={openDrawer} />

      {searchOpen ? (
        <div id="global-search-panel" className={styles.searchPanel} role="dialog" aria-label="Tìm kiếm trong cộng đồng">
          <div className={`shell-width ${styles.searchPanelInner}`}>
            <SearchField value={searchValue} onChange={(value) => { setSearchValue(value); setSearchAnnouncement(""); }} onSubmit={submitSearch} compact />
            <Button className={styles.searchClose} variant="quiet" size="sm" onClick={closeSearch}>Đóng</Button>
          </div>
          {searchAnnouncement ? <p className={`shell-width ${styles.searchPanelStatus}`} role="status">{searchAnnouncement}</p> : null}
        </div>
      ) : null}

      <Drawer open={drawerOpen} title="Menu" onClose={closeDrawer} initialFocusRef={drawerCloseRef} returnFocusRef={menuButtonRef}>
        <nav className={styles.drawerNav} aria-label="Điều hướng menu di động">
          <Link className={`${styles.drawerNavItem} ${styles.drawerNavItemActive}`} to="/" onClick={closeDrawer}><Icon name="home" size={20} /><span>Trang chủ</span></Link>
           {additionalNavigation.map((item) => <NavigationLink key={item.id} item={item} className={styles.drawerNavItem} onClick={closeDrawer} />)}
         </nav>
         <div className={styles.drawerAuth} aria-label='Tài khoản'>
           {isAuthenticated ? (
             <button
               className={styles.drawerAuthButton}
               type='button'
               onClick={() => {
                 closeDrawer();
                 runLogout(onLogout);
               }}
             >
               Đăng xuất
             </button>
           ) : (
             <>
               <Link className={styles.drawerAuthButton} to='/login' onClick={closeDrawer}>Đăng nhập</Link>
               <Link className={styles.drawerAuthButtonPrimary} to='/register' onClick={closeDrawer}>Đăng ký</Link>
             </>
           )}
         </div>
       </Drawer>

      <MobileActionBar onSearch={openSearch} onMenu={openDrawer} />
    </header>
  );
}
function HeaderAuthActions({ isAuthenticated, onLogout }: { isAuthenticated: boolean; onLogout?: () => Promise<void> | void }) {
  if (isAuthenticated) {
    return (
      <button className={styles.headerAuthLink} type='button' onClick={() => runLogout(onLogout)}>
        Đăng xuất
      </button>
    );
  }
  return (
    <div className={styles.headerAuthLinks}>
      <Link className={styles.headerAuthLink} to='/login'>Đăng nhập</Link>
      <Link className={styles.headerAuthLinkPrimary} to='/register'>Đăng ký</Link>
    </div>
  );
}

function runLogout(onLogout?: () => Promise<void> | void): void {
  try {
    const pending = onLogout?.();
    if (pending) void pending.catch(() => undefined);
  } catch {
    // The provider owns auth-state cleanup; the shell has no error surface.
  }
}
