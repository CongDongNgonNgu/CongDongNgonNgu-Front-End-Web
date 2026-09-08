import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { additionalNavigation, futureLabel, headerNavigation, type NavigationItem } from "../navigation/navigation";
import { Badge } from "../ui/Surface";
import { Drawer } from "../ui/Overlays";
import { SearchField } from "../ui/Feedback";
import { Button } from "../ui/Button";
import { HeaderDesktop } from "./HeaderDesktop";
import { HeaderMobile } from "./HeaderMobile";

interface HeaderProps {
  isAuthenticated?: boolean;
}

function FutureDrawerItem({ item }: { item: NavigationItem }) {
  return <div className="drawer-nav__item drawer-nav__item--disabled" aria-disabled="true"><span className="shell-icon" aria-hidden="true">{item.glyph}</span><span>{item.label}</span><Badge>{futureLabel}</Badge></div>;
}

export function Header({ isAuthenticated = false }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleMore = useCallback(() => {
    setMoreOpen((open) => !open);
    setAccountOpen(false);
  }, []);
  const toggleAccount = useCallback(() => {
    setAccountOpen((open) => !open);
    setMoreOpen(false);
  }, []);
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchSubmitted(false);
    setMoreOpen(false);
    setAccountOpen(false);
  }, []);
  const submitSearch = useCallback(() => setSearchSubmitted(true), []);

  return (
    <header className="site-header">
      <HeaderDesktop
        isAuthenticated={isAuthenticated}
        moreOpen={moreOpen}
        onMoreToggle={toggleMore}
        onSearch={openSearch}
        searchOpen={searchOpen}
        onAccountToggle={toggleAccount}
        accountOpen={accountOpen}
      />
      <HeaderMobile isAuthenticated={isAuthenticated} searchOpen={searchOpen} onSearch={openSearch} onMenu={() => setDrawerOpen(true)} menuButtonRef={menuButtonRef} />

      {searchOpen ? (
        <div id="global-search-panel" className="search-panel" role="dialog" aria-label="Tìm kiếm trong cộng đồng">
          <div className="shell-width search-panel__inner">
            <SearchField value={searchValue} onChange={(value) => { setSearchValue(value); setSearchSubmitted(false); }} onSubmit={submitSearch} />
            <Button variant="quiet" size="sm" onClick={() => setSearchOpen(false)}>Đóng</Button>
          </div>
          {searchSubmitted ? <p className="shell-width search-panel__status" role="status">Tìm kiếm sẽ khả dụng khi tính năng cộng đồng được mở. <Badge>{futureLabel}</Badge></p> : null}
        </div>
      ) : null}

      <Drawer open={drawerOpen} title="Menu" onClose={closeDrawer} initialFocusRef={drawerCloseRef} returnFocusRef={menuButtonRef}>
        <nav className="drawer-nav" aria-label="Điều hướng menu di động">
          <Link className="drawer-nav__item drawer-nav__item--active" to="/" onClick={closeDrawer}><span className="shell-icon" aria-hidden="true">⌂</span><span>Trang chủ</span></Link>
          {headerNavigation.slice(1).map((item) => <FutureDrawerItem key={item.id} item={item} />)}
          {additionalNavigation.map((item) => <FutureDrawerItem key={item.id} item={item} />)}
        </nav>
        <div className="drawer-auth">
          {isAuthenticated ? <div className="drawer-account"><span><strong>Người học</strong><small>Tài khoản</small></span><Badge>{futureLabel}</Badge></div> : <><Button variant="quiet" fullWidth disabled>Đăng nhập <Badge>{futureLabel}</Badge></Button><Button variant="secondary" fullWidth disabled>Đăng ký <Badge>{futureLabel}</Badge></Button></>}
        </div>
      </Drawer>
    </header>
  );
}