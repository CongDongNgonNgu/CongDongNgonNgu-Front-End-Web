import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { DesktopHeader } from './DesktopHeader';
import { HeaderDrawer } from './HeaderDrawer';
import { HeaderSearchPanel } from './HeaderSearchPanel';
import { MobileActionBar } from './MobileActionBar';
import { MobileHeader } from './MobileHeader';
import styles from './Header.module.css';

interface HeaderProps {
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void> | void;
  hideMobileActionBar?: boolean;
}

export function Header({ isAuthenticated = false, onLogout, hideMobileActionBar = false }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchAnnouncement, setSearchAnnouncement] = useState('');
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
    setSearchAnnouncement('');
    setMoreOpen(false);
    setAccountOpen(false);
    setDrawerOpen(false);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const submitSearch = useCallback(() => {
    const value = searchValue.trim();
    setSearchAnnouncement(value ? `Đã nhận từ khóa “${value}”.` : 'Nhập một từ khóa để bắt đầu.');
  }, [searchValue]);

  useEffect(() => {
    if (!searchOpen) {
      searchTriggerRef.current?.focus();
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch, searchOpen]);

  return (
    <header className={styles.siteHeader} role='banner'>
      <DesktopHeader
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        moreOpen={moreOpen}
        onMoreToggle={toggleMore}
        onSearch={openSearch}
        searchOpen={searchOpen}
        onAccountToggle={toggleAccount}
        accountOpen={accountOpen}
      />
      <MobileHeader isAuthenticated={isAuthenticated} searchOpen={searchOpen} onSearch={openSearch} onMenu={openDrawer} />

      {searchOpen ? (
        <HeaderSearchPanel
          value={searchValue}
          announcement={searchAnnouncement}
          onChange={(value) => { setSearchValue(value); setSearchAnnouncement(''); }}
          onSubmit={submitSearch}
          onClose={closeSearch}
        />
      ) : null}

      <HeaderDrawer
        open={drawerOpen}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onClose={closeDrawer}
        initialFocusRef={drawerCloseRef}
        returnFocusRef={menuButtonRef}
      />

      {hideMobileActionBar ? null : <MobileActionBar onSearch={openSearch} onMenu={openDrawer} />}
    </header>
  );
}
