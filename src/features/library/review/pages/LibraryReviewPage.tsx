import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '../../../../components/ui/Feedback';
import { useAuth, type AuthStatus } from '../../../auth/AuthProvider';
import type { AuthUser } from '../../../auth/auth.types';
import { LibraryReviewApi } from '../library-review.api';
import type { LibraryReviewApiPort } from '../library-review.types';
import { LibraryReviewQueue } from '../components/LibraryReviewQueue';
import styles from './LibraryReviewPage.module.css';

export function LibraryReviewPage() {
  const { api, status, user } = useAuth();
  const reviewApi = useMemo(() => new LibraryReviewApi(api), [api]);
  return <LibraryReviewPageView api={reviewApi} authStatus={status} user={user} />;
}

export interface LibraryReviewPageViewProps {
  api: LibraryReviewApiPort;
  authStatus: AuthStatus;
  user: AuthUser | null;
}

export function LibraryReviewPageView({ api, authStatus, user }: LibraryReviewPageViewProps) {
  const location = useLocation();
  if (authStatus === 'loading') return <ReviewLoading />;
  if (authStatus === 'unauthenticated') return <Navigate to='/login' replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (!isReviewer(user)) return <ReviewAccessDenied />;
  return <LibraryReviewQueue api={api} />;
}

export function isReviewer(user: AuthUser | null): boolean {
  return Boolean(user?.roles.some((role) => role === 'MODERATOR' || role === 'ADMIN'));
}

export function ReviewLoading() {
  return <main className={styles.surface} role='status' aria-label='Đang kiểm tra quyền truy cập'><Skeleton lines={6} label='Đang kiểm tra quyền truy cập' /></main>;
}

export function ReviewAccessDenied() {
  return <main className={styles.surface} role='alert' aria-labelledby='review-access-denied'><p className={styles.eyebrow}>REVIEWER ACCESS</p><h1 id='review-access-denied'>Bạn chưa được cấp quyền kiểm duyệt.</h1><p>Không gian này chỉ dành cho MODERATOR và ADMIN.</p></main>;
}
