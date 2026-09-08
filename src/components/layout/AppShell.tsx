import type { ReactNode } from "react";
import { Footer } from "./Footer/Footer";
import { Header } from "./Header/Header";

interface AppShellProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function AppShell({ children, isAuthenticated = false }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <Header isAuthenticated={isAuthenticated} />
      <main className="shell-width site-main" id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  );
}
