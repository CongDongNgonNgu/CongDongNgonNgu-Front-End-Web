import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { additionalNavigation, futureLabel, headerNavigation, type NavigationItem } from "../navigation/navigation";
import { Button } from "../ui/Button";
import { DropdownMenu } from "../ui/Overlays";
import { Avatar, Badge } from "../ui/Surface";

interface DesktopHeaderProps {
  isAuthenticated: boolean;
  moreOpen: boolean;
  onMoreToggle: () => void;
  onSearch: () => void;
  searchOpen: boolean;
  onAccountToggle: () => void;
  accountOpen: boolean;
}

function FutureNavItem({ item, className = "" }: { item: NavigationItem; className?: string }) {
  return (
    <span className={["nav-item-disabled", className].filter(Boolean).join(" ")} aria-disabled="true">
      <span>{item.label}</span>
      <Badge tone="neutral">{futureLabel}</Badge>
    </span>
  );
}

export function HeaderDesktop({
  isAuthenticated,
  moreOpen,
  onMoreToggle,
  onSearch,
  searchOpen,
  onAccountToggle,
  accountOpen,
}: DesktopHeaderProps) {
  return (
    <div className="desktop-header">
      <div className="shell-width header-inner">
        <Link className="brand" to="/" aria-label="Cộng đồng ngôn ngữ, Trang chủ">
          <img className="brand-mark" src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
          <span className="brand-wordmark">
            <span className="brand-name">Cộng đồng ngôn ngữ</span>
            <span className="brand-tagline">Global language community</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <ul className="desktop-nav__list">
            {headerNavigation.map((item) => (
              <li key={item.id} className={`desktop-nav__item desktop-nav__item--${item.id}`}>
                {item.href ? <Link className="nav-link nav-link--active" to={item.href} aria-current="page">{item.label}</Link> : <FutureNavItem item={item} />}
              </li>
            ))}
            <li className="desktop-nav__item desktop-nav__item--more">
              <DropdownMenu open={moreOpen} label="Thêm" onToggle={onMoreToggle}>
                {additionalNavigation.map((item) => <div key={item.id} className="dropdown__item" role="menuitem" aria-disabled="true"><span className="shell-icon" aria-hidden="true">{item.glyph}</span><span>{item.label}</span><Badge>{futureLabel}</Badge></div>)}
              </DropdownMenu>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <button className="icon-button header-action" type="button" onClick={onSearch} aria-label="Tìm kiếm" aria-expanded={searchOpen} aria-controls="global-search-panel">
            <span className="shell-icon" aria-hidden="true">⌕</span><span className="header-action-label">Tìm kiếm</span>
          </button>
          <button className="icon-button header-action" type="button" disabled aria-label="Thông báo, sắp có">
            <span className="shell-icon" aria-hidden="true">•</span><span className="header-action-label">Thông báo</span>
          </button>
          <span className="membership-action" aria-disabled="true">Thành viên <Badge>{futureLabel}</Badge></span>
          {isAuthenticated ? (
            <div className="account-menu-wrap">
              <button className="account-trigger" type="button" onClick={onAccountToggle} aria-haspopup="menu" aria-expanded={accountOpen}>
                <Avatar name="Người học" size="sm" /><span className="header-action-label">Tài khoản</span>
              </button>
              {accountOpen ? <div className="account-menu" role="menu" aria-label="Tài khoản"><div className="dropdown__item" role="menuitem" aria-disabled="true">Cá nhân <Badge>{futureLabel}</Badge></div><div className="dropdown__item" role="menuitem" aria-disabled="true">Đăng xuất <Badge>{futureLabel}</Badge></div></div> : null}
            </div>
          ) : (
            <div className="auth-actions">
              <Button variant="quiet" size="sm" disabled aria-label="Đăng nhập, sắp có">Đăng nhập <Badge>{futureLabel}</Badge></Button>
              <Button variant="secondary" size="sm" disabled aria-label="Đăng ký, sắp có">Đăng ký <Badge>{futureLabel}</Badge></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type HeaderMenuButtonRef = RefObject<HTMLButtonElement>;