import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { AuthCallbackPage } from './features/auth/pages/AuthCallbackPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

function RoutedApp() {
  const { status, logout } = useAuth();
  const { pathname } = useLocation();
  const authLayout = pathname === '/login'
    || pathname === '/register'
    || pathname === '/verify-email'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || pathname === '/auth/callback';
  const authSurface = pathname === '/login' ? 'login' : pathname === '/register' ? 'register' : 'flow';
  const authFooterTone = 'light';
  return (
    <AppShell isAuthenticated={status === 'authenticated'} onLogout={logout} authLayout={authLayout} authSurface={authSurface} authFooterTone={authFooterTone}>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/verify-email' element={<VerifyEmailPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/reset-password' element={<ResetPasswordPage />} />
        <Route path='/auth/callback' element={<AuthCallbackPage />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoutedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
