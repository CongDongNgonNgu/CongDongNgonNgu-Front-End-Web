import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationCenterProvider } from './features/notifications/NotificationCenterProvider';
import { SeoHead } from './features/seo/SeoHead';
import { UiLocaleProvider, useUiLocale } from './features/ui-locale/UiLocaleProvider';

const AuthCallbackPage = lazy(() => import('./features/auth/pages/AuthCallbackPage').then(({ AuthCallbackPage }) => ({ default: AuthCallbackPage })));
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })));
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage').then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./features/auth/pages/VerifyEmailPage').then(({ VerifyEmailPage }) => ({ default: VerifyEmailPage })));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage').then(({ OnboardingPage }) => ({ default: OnboardingPage })));
const OwnPassportPage = lazy(() => import('./features/passport/PassportPages').then(({ OwnPassportPage }) => ({ default: OwnPassportPage })));
const PublicPassportPage = lazy(() => import('./features/passport/PassportPages').then(({ PublicPassportPage }) => ({ default: PublicPassportPage })));
const LanguageExplorerPage = lazy(() => import('./features/languages/pages/LanguageExplorerPage').then(({ LanguageExplorerPage }) => ({ default: LanguageExplorerPage })));
const LanguageHubPage = lazy(() => import('./features/languages/pages/LanguageHubPage').then(({ LanguageHubPage }) => ({ default: LanguageHubPage })));
const LibraryExplorerPage = lazy(() => import('./features/library/pages/LibraryExplorerPage').then(({ LibraryExplorerPage }) => ({ default: LibraryExplorerPage })));
const LibraryContributionPage = lazy(() => import('./features/library/pages/LibraryContributionPage').then(({ LibraryContributionPage }) => ({ default: LibraryContributionPage })));
const LibraryResourceDetailPage = lazy(() => import('./features/library/pages/LibraryResourceDetailPage').then(({ LibraryResourceDetailPage }) => ({ default: LibraryResourceDetailPage })));
const LibraryReviewPage = lazy(() => import('./features/library/review/pages/LibraryReviewPage').then(({ LibraryReviewPage }) => ({ default: LibraryReviewPage })));
const LibraryReviewDetailPage = lazy(() => import('./features/library/review/pages/LibraryReviewDetailPage').then(({ LibraryReviewDetailPage }) => ({ default: LibraryReviewDetailPage })));
const CommunityPage = lazy(() => import('./features/community/pages/CommunityPage').then(({ CommunityPage }) => ({ default: CommunityPage })));
const CommunityPostDetailPage = lazy(() => import('./features/community/pages/CommunityPostDetailPage').then(({ CommunityPostDetailPage }) => ({ default: CommunityPostDetailPage })));
const CommunityCorrectionRequestPage = lazy(() => import('./features/community/pages/CommunityCorrectionRequestPage').then(({ CommunityCorrectionRequestPage }) => ({ default: CommunityCorrectionRequestPage })));
const CommunityQuestionRequestPage = lazy(() => import('./features/community/pages/CommunityQuestionRequestPage').then(({ CommunityQuestionRequestPage }) => ({ default: CommunityQuestionRequestPage })));
const PartnerDiscoveryPage = lazy(() => import('./features/exchange/pages/PartnerDiscoveryPage').then(({ PartnerDiscoveryPage }) => ({ default: PartnerDiscoveryPage })));
const BuddyProfilePreviewPage = lazy(() => import('./features/exchange/pages/BuddyProfilePreviewPage').then(({ BuddyProfilePreviewPage }) => ({ default: BuddyProfilePreviewPage })));
const ConnectionsPage = lazy(() => import('./features/exchange/pages/ConnectionsPage').then(({ ConnectionsPage }) => ({ default: ConnectionsPage })));
const AiConversationPage = lazy(() => import('./features/ai/conversation/pages/AiConversationPage').then(({ AiConversationPage }) => ({ default: AiConversationPage })));
const AiCoachingPage = lazy(() => import('./features/ai/coaching/pages/AiCoachingPage').then(({ AiCoachingPage }) => ({ default: AiCoachingPage })));
const MembershipPage = lazy(() => import('./features/membership/MembershipPage').then(({ MembershipPage }) => ({ default: MembershipPage })));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage').then(({ NotificationsPage }) => ({ default: NotificationsPage })));
const SpeakingRoomPage = lazy(() => import('./features/rooms/pages/SpeakingRoomPage').then(({ SpeakingRoomPage }) => ({ default: SpeakingRoomPage })));
const ChallengeDiscoveryPage = lazy(() => import('./features/challenges/pages/ChallengeDiscoveryPage').then(({ ChallengeDiscoveryPage }) => ({ default: ChallengeDiscoveryPage })));
const EventDetailPage = lazy(() => import('./features/events/pages/EventDetailPage').then(({ EventDetailPage }) => ({ default: EventDetailPage })));
const EventDiscoveryPage = lazy(() => import('./features/events/pages/EventDiscoveryPage').then(({ EventDiscoveryPage }) => ({ default: EventDiscoveryPage })));
const AdminPage = lazy(() => import('./features/admin/pages/AdminPage').then(({ AdminPage }) => ({ default: AdminPage })));

const StudyGroupsPage = lazy(() => import('./features/study-groups/pages/StudyGroupsPage').then(({ StudyGroupsPage }) => ({ default: StudyGroupsPage })));
const StudyGroupPage = lazy(() => import('./features/study-groups/pages/StudyGroupPage').then(({ StudyGroupPage }) => ({ default: StudyGroupPage })));

function RouteLoading() {
  const { t } = useUiLocale();
  return <p className='shell-width' role='status' aria-live='polite'>{t('common.pageLoading')}</p>;
}

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
  const isAdminRoute = pathname.startsWith('/admin');
  return (
    <NotificationCenterProvider enabled={status === 'authenticated'}>
      <SeoHead />
      <AppShell isAuthenticated={status === 'authenticated'} userDisplayName={user?.displayName} onLogout={logout} authLayout={authLayout} authSurface={authSurface} authFooterTone={authFooterTone} chrome={isAdminRoute ? 'admin' : 'public'}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='/languages' element={<LanguageExplorerPage />} />
            <Route path='/languages/:slug' element={<LanguageHubPage />} />
            <Route path='/library' element={<LibraryExplorerPage />} />
            <Route path='/library/contribute' element={<LibraryContributionPage />} />
            <Route path='/library/review/:resourceId' element={<LibraryReviewDetailPage />} />
            <Route path='/library/review' element={<LibraryReviewPage />} />
            <Route path='/library/:resourceId' element={<LibraryResourceDetailPage />} />
            <Route path='/community' element={<CommunityPage />} />
            <Route path='/community/groups' element={<StudyGroupsPage />} />
            <Route path='/community/groups/invitations' element={<StudyGroupsPage />} />
            <Route path='/community/groups/:groupId' element={<StudyGroupPage />} />
            <Route path='/community/ask/correction' element={<CommunityCorrectionRequestPage />} />
            <Route path='/community/ask/question' element={<CommunityQuestionRequestPage />} />
            <Route path='/community/posts/:postId' element={<CommunityPostDetailPage />} />
            <Route path='/exchange' element={<PartnerDiscoveryPage />} />
            <Route path='/exchange/connections' element={<ConnectionsPage />} />
            <Route path='/exchange/profile/:userId' element={<BuddyProfilePreviewPage />} />
            <Route path='/membership' element={<MembershipPage />} />
            <Route path='/membership/checkout/:orderId' element={<MembershipPage />} />
            <Route path='/notifications' element={<NotificationsPage />} />
            <Route path='/rooms/:roomId' element={<SpeakingRoomPage />} />
            <Route path='/challenges' element={<ChallengeDiscoveryPage />} />
            <Route path='/events' element={<EventDiscoveryPage />} />
            <Route path='/events/:eventId' element={<EventDetailPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route path='/verify-email' element={<VerifyEmailPage />} />
            <Route path='/forgot-password' element={<ForgotPasswordPage />} />
            <Route path='/reset-password' element={<ResetPasswordPage />} />
            <Route path='/auth/callback' element={<AuthCallbackPage />} />
            <Route path='/onboarding' element={<OnboardingPage />} />
            <Route path='/profile' element={<OwnPassportPage />} />
            <Route path='/profiles/:userId' element={<PublicPassportPage />} />
            <Route path='/ai' element={<Navigate to='/ai/conversation' replace />} />
            <Route path='/ai/conversation' element={<AiConversationPage />} />
            <Route path='/ai/roleplay' element={<AiConversationPage forcedMode='roleplay' />} />
            <Route path='/ai/writing' element={<AiCoachingPage />} />
            <Route path='/ai/grammar' element={<AiCoachingPage />} />
            <Route path='/admin' element={<AdminPage />} />
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppShell>
    </NotificationCenterProvider>
  );
}

export function App() {
  return (
    <UiLocaleProvider><BrowserRouter>
      <AuthProvider>
        <RoutedApp />
      </AuthProvider>
    </BrowserRouter></UiLocaleProvider>
  );
}
