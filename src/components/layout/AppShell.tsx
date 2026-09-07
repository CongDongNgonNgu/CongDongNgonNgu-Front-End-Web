import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header" role="banner">
        <div className="shell-width header-inner">
          <Link className="brand" to="/" aria-label="CongDongNgonNgu.vn home">
            <img
              className="brand-mark"
              src="/brand/congdongngonngu-mark.png"
              alt=""
              width="512"
              height="512"
            />
            <span className="brand-wordmark">
              <span className="brand-name">CongDongNgonNgu.vn</span>
              <span className="brand-tagline">Global Language Community</span>
            </span>
          </Link>
          <p className="phase-label">PHASE 00 / FOUNDATION</p>
        </div>
      </header>

      <main className="shell-width site-main" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="shell-width footer-inner">
          <span>Independent language community foundation</span>
          <span>Technical shell only</span>
        </div>
      </footer>
    </div>
  );
}
