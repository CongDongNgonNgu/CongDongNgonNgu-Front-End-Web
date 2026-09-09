import type { ReactNode } from 'react';
import { Footer } from './Footer/Footer';
import { Header } from './Header/Header';

interface AppShellProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void> | void;
  authLayout?: boolean;
  authSurface?: 'login' | 'register' | 'flow';
  authFooterTone?: 'light' | 'dark';
}

export function AppShell({ children, isAuthenticated = false, onLogout, authLayout = false, authSurface = 'flow', authFooterTone = 'light' }: AppShellProps) {
  const shellClasses = ['app-shell', authLayout ? `auth-shell auth-shell-${authSurface}` : ''].filter(Boolean).join(' ');
  return (
    <div className={shellClasses}>
      <a className='skip-link' href='#main-content'>Bỏ qua đến nội dung chính</a>
      <Header isAuthenticated={isAuthenticated} onLogout={onLogout} hideMobileActionBar={authLayout} />
      <main className={authLayout ? 'site-main auth-site-main' : 'shell-width site-main'} id='main-content' tabIndex={-1}>{children}</main>
      <Footer compact={authLayout} compactTone={authFooterTone} />
    </div>
  );
}
