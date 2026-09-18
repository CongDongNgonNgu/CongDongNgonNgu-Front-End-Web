import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { AuthCallbackPage } from './features/auth/pages/AuthCallbackPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { OwnPassportPage, PublicPassportPage } from './features/passport/PassportPages';
import { LanguageExplorerPage } from './features/languages/pages/LanguageExplorerPage';
import { LanguageHubPage } from './features/languages/pages/LanguageHubPage';
import { CommunityPage } from './features/community/pages/CommunityPage';
import { CommunityPostDetailPage } from './features/community/pages/CommunityPostDetailPage';
import { CommunityCorrectionRequestPage } from './features/community/pages/CommunityCorrectionRequestPage';
import { CommunityQuestionRequestPage } from './features/community/pages/CommunityQuestionRequestPage';
import { PartnerDiscoveryPage } from './features/exchange/pages/PartnerDiscoveryPage';
import { BuddyProfilePreviewPage } from './features/exchange/pages/BuddyProfilePreviewPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

function RoutedApp() {
  const { status, user, logout } = useAuth();
  const { pathname } = useLocation();
  const authLayout = pathname === '/login'
    || pathname === '/register'
    || pathname === '/verify-email'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || pathname === '/auth/callback'
    || pathname === '/onboarding';
  const authSurface = pathname === '/login' ? 'login' : pathname === '/register' ? 'register' : 'flow';
  const authFooterTone = 'light';
  return (
    <AppShell isAuthenticated={status === 'authenticated'} userDisplayName={user?.displayName} onLogout={logout} authLayout={authLayout} authSurface={authSurface} authFooterTone={authFooterTone}>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/languages' element={<LanguageExplorerPage />} />
        <Route path='/languages/:slug' element={<LanguageHubPage />} />
        <Route path='/community' element={<CommunityPage />} />
        <Route path='/community/ask/correction' element={<CommunityCorrectionRequestPage />} />
        <Route path='/community/ask/question' element={<CommunityQuestionRequestPage />} />
        <Route path='/community/posts/:postId' element={<CommunityPostDetailPage />} />
        <Route path='/exchange' element={<PartnerDiscoveryPage />} />
        <Route path='/exchange/profile/:userId' element={<BuddyProfilePreviewPage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/verify-email' element={<VerifyEmailPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/reset-password' element={<ResetPasswordPage />} />
        <Route path='/auth/callback' element={<AuthCallbackPage />} />
        <Route path='/onboarding' element={<OnboardingPage />} />
        <Route path='/profile' element={<OwnPassportPage />} />
        <Route path='/profiles/:userId' element={<PublicPassportPage />} />
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
