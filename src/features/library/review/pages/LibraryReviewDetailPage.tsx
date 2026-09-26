import { useMemo } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { ErrorState, Skeleton } from '../../../../components/ui/Feedback';
import { useAuth, type AuthStatus } from '../../../auth/AuthProvider';
import type { AuthUser } from '../../../auth/auth.types';
import { LibraryReviewDetail } from '../components/LibraryReviewDetail';
import { getLibraryReviewErrorMessage } from '../library-review.errors';
import { LibraryReviewApi } from '../library-review.api';
import type { LibraryReviewApiPort } from '../library-review.types';
import { useLibraryReviewDetail } from '../hooks/useLibraryReviewDetail';
import { isReviewer, ReviewAccessDenied, ReviewLoading } from './LibraryReviewPage';
import styles from './LibraryReviewDetailPage.module.css';

export function LibraryReviewDetailPage() {
  const { api, status, user } = useAuth();
  const reviewApi = useMemo(() => new LibraryReviewApi(api), [api]);
  const { resourceId } = useParams<{ resourceId: string }>();
  return <LibraryReviewDetailPageView api={reviewApi} authStatus={status} user={user} resourceId={resourceId} />;
}

interface LibraryReviewDetailPageViewProps {
  api: LibraryReviewApiPort;
  authStatus: AuthStatus;
  user: AuthUser | null;
  resourceId?: string;
}

export function LibraryReviewDetailPageView({ api, authStatus, user, resourceId }: LibraryReviewDetailPageViewProps) {
  const location = useLocation();
  if (authStatus === 'loading') return <ReviewLoading />;
  if (authStatus === 'unauthenticated') return <Navigate to='/login' replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (!isReviewer(user)) return <ReviewAccessDenied />;
  return <AuthorizedReviewDetail api={api} resourceId={resourceId} />;
}

function AuthorizedReviewDetail({ api, resourceId }: { api: LibraryReviewApiPort; resourceId?: string }) {
  const detail = useLibraryReviewDetail(api, resourceId);
  if (detail.isLoading) return <main className={styles.surface} role='status'><Skeleton lines={10} label='Đang tải chi tiết kiểm duyệt' /></main>;
  if (detail.error) return <main className={styles.surface}><ErrorState title='Không thể tải chi tiết kiểm duyệt' description={getLibraryReviewErrorMessage(detail.error)} onRetry={() => void detail.refresh()} retrying={detail.isLoading} /></main>;
  if (!detail.detail) return null;
  return <LibraryReviewDetail api={api} detail={detail.detail} onRefresh={detail.refresh} />;
}
