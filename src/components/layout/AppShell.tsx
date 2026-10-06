import type { ReactNode } from 'react';
import { PwaExperience } from '../../features/pwa/PwaExperience';
import { Footer } from './Footer/Footer';
import { Header } from './Header/Header';
import { useHashScroll } from './useHashScroll';

interface AppShellProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  userDisplayName?: string;
  onLogout?: () => Promise<void> | void;
  authLayout?: boolean;
  authSurface?: 'login' | 'register' | 'flow';
  authFooterTone?: 'light' | 'dark';
  chrome?: 'public' | 'admin';
}

export function AppShell({ children, isAuthenticated = false, userDisplayName, onLogout, authLayout = false, authSurface = 'flow', authFooterTone = 'light', chrome = 'public' }: AppShellProps) {
  useHashScroll();
  const isAdminChrome = chrome === 'admin';
  const shellClasses = ['app-shell', authLayout ? `auth-shell auth-shell-${authSurface}` : '', isAdminChrome ? 'admin-shell' : ''].filter(Boolean).join(' ');
  return (
    <div className={shellClasses}>
      <a className='skip-link' href='#main-content'>Bỏ qua đến nội dung chính</a>
      <PwaExperience />
      {!isAdminChrome && <Header isAuthenticated={isAuthenticated} userDisplayName={userDisplayName} onLogout={onLogout} hideMobileActionBar={authLayout} />}
      <main className={isAdminChrome ? 'admin-site-main' : authLayout ? 'site-main auth-site-main' : 'shell-width site-main'} id='main-content' tabIndex={-1}>{children}</main>
      {!isAdminChrome && <Footer compact={authLayout} compactTone={authFooterTone} />}
    </div>
  );
}
