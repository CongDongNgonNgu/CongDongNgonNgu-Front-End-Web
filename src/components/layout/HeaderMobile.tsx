import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Surface";

interface MobileHeaderProps {
  isAuthenticated: boolean;
  searchOpen: boolean;
  onSearch: () => void;
  onMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
}

export function HeaderMobile({ isAuthenticated, searchOpen, onSearch, onMenu, menuButtonRef }: MobileHeaderProps) {
  return (
    <div className="mobile-header">
      <div className="shell-width mobile-header__inner">
        <Link className="mobile-brand" to="/" aria-label="Cộng đồng ngôn ngữ, Trang chủ">
          <img src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
          <span>Cộng đồng</span>
        </Link>
        <div className="mobile-header__actions">
          <button className="icon-button" type="button" onClick={onSearch} aria-label="Tìm kiếm" aria-expanded={searchOpen} aria-controls="global-search-panel"><span className="shell-icon" aria-hidden="true">⌕</span></button>
          <button className="icon-button" type="button" disabled aria-label="Thông báo, sắp có"><span className="shell-icon" aria-hidden="true">•</span></button>
          {isAuthenticated ? <Button variant="quiet" size="sm" className="mobile-account-button" onClick={onMenu} aria-label="Tài khoản" aria-haspopup="dialog"><Avatar name="Người học" size="sm" /></Button> : null}
          <button ref={menuButtonRef} className="icon-button" type="button" onClick={onMenu} aria-label="Mở menu"><span className="shell-icon" aria-hidden="true">≡</span></button>
        </div>
      </div>
    </div>
  );
}