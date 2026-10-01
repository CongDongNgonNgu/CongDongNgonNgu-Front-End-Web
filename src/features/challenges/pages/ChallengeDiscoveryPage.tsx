import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Badge } from '../../../components/ui/Surface';
import { useAuth, type AuthStatus } from '../../auth/AuthProvider';
import { challengeApi, createChallengeApi, type ChallengeApi } from '../challenge.api';
import type {
  ChallengePublicDetail,
  ChallengePublicProgress,
  ChallengePublicStateFilter,
  ChallengePublicSummary,
} from '../challenge.types';
import { challengeStateLabel, challengeStateTone } from '../challenge.formatters';
import { ChallengeCard } from '../components/ChallengeCard';
import { ChallengeDetailPanel } from '../components/ChallengeDetailPanel';
import styles from './ChallengeDiscoveryPage.module.css';

interface ChallengeDiscoveryPageViewProps {
  api?: ChallengeApi;
  authStatus: AuthStatus;
}

export function ChallengeDiscoveryPage() {
  const auth = useAuth();
  const api = useMemo(() => createChallengeApi(auth.api), [auth.api]);
  return <ChallengeDiscoveryPageView api={api} authStatus={auth.status} />;
}

export function ChallengeDiscoveryPageView({ api = challengeApi, authStatus }: ChallengeDiscoveryPageViewProps) {
  const [stateFilter, setStateFilter] = useState<ChallengePublicStateFilter>('ALL');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [challenges, setChallenges] = useState<ChallengePublicSummary[] | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChallengePublicDetail | null>(null);
  const [progress, setProgress] = useState<ChallengePublicProgress | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);

  const loadChallenges = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const result = await api.list({
        state: stateFilter,
        languageCode: languageFilter === 'ALL' ? undefined : languageFilter,
        limit: 50,
      });
      if (requestId !== listRequestId.current) return;
      setChallenges(result);
    } catch (cause) {
      if (requestId !== listRequestId.current) return;
      setChallenges(null);
      setListError(cause);
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, [api, languageFilter, stateFilter]);

  const loadDetail = useCallback(async (challengeId: string) => {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    try {
      const nextDetail = await api.get(challengeId);
      const nextProgress = authStatus === 'authenticated' ? await api.getProgress(challengeId) : null;
      if (requestId !== detailRequestId.current) return;
      setDetail(nextDetail);
      setProgress(nextProgress);
    } catch (cause) {
      if (requestId !== detailRequestId.current) return;
      setDetail(null);
      setProgress(null);
      setDetailError(cause);
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, [api, authStatus]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const visibleChallenges = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    if (!challenges || !query) return challenges ?? [];
    return challenges.filter((challenge) => [
      challenge.title,
      challenge.description,
      challenge.languageCode,
      challenge.level ?? '',
      challenge.topic ?? '',
    ].some((value) => value.toLocaleLowerCase('vi-VN').includes(query)));
  }, [challenges, search]);

  useEffect(() => {
    if (visibleChallenges.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleChallenges.some((challenge) => challenge.id === selectedId)) {
      setSelectedId(visibleChallenges[0].id);
    }
  }, [selectedId, visibleChallenges]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
      setProgress(null);
      setDetailError(null);
    }
  }, [loadDetail, selectedId]);

  const languageOptions = useMemo(() => [...new Set((challenges ?? []).map((challenge) => challenge.languageCode))].sort(), [challenges]);

  const handleAction = async (action: 'join' | 'leave') => {
    if (!selectedId || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (action === 'join') await api.join(selectedId);
      else await api.leave(selectedId);
      await Promise.all([loadChallenges(), loadDetail(selectedId)]);
    } catch (cause) {
      setActionError(getActionErrorMessage(cause));
    } finally {
      setActionLoading(false);
    }
  };

  const selectedSummary = visibleChallenges.find((challenge) => challenge.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Thử thách</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>THỬ THÁCH HỮU HẠN · PHASE 14B</p>
          <h1>Học cùng một mục tiêu, theo nhịp của bạn.</h1>
          <p className={styles.heroDescription}>
            Mỗi thử thách có mục tiêu và thời hạn rõ ràng. Không có chuỗi ngày, bảng xếp hạng hay phạt khi bạn cần nghỉ.
          </p>
        </div>
        <aside className={styles.heroNote} aria-label='Nguyên tắc thử thách'>
          <Badge tone='info'>Mục tiêu hữu hạn</Badge>
          <h2>Tiến độ đến từ hoạt động hợp lệ</h2>
          <p>Máy chủ ghi nhận những hoạt động đủ điều kiện và hiển thị lại cho bạn theo cùng một tiêu chí.</p>
          <span className={styles.noteLine}><Icon name='shield-check' size={18} />Không dùng dữ liệu tự khai làm bằng chứng.</span>
        </aside>
      </header>

      <section className={styles.toolbar} aria-label='Bộ lọc thử thách'>
        <label className={styles.searchField}>
          <Icon name='search' size={18} />
          <span className={styles.visuallyHidden}>Tìm thử thách</span>
          <input type='search' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Tìm theo tên, chủ đề hoặc ngôn ngữ' />
        </label>
        <label className={styles.filterField}>
          <span>Trạng thái</span>
          <select aria-label='Lọc trạng thái thử thách' value={stateFilter} onChange={(event) => setStateFilter(event.target.value as ChallengePublicStateFilter)}>
            <option value='ALL'>Đang mở và sắp bắt đầu</option>
            <option value='ACTIVE'>Đang mở</option>
            <option value='UPCOMING'>Sắp bắt đầu</option>
            <option value='EXPIRED'>Đã kết thúc</option>
            <option value='CANCELLED'>Đã hủy</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Ngôn ngữ</span>
          <select aria-label='Lọc ngôn ngữ thử thách' value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
            <option value='ALL'>Tất cả ngôn ngữ</option>
            {languageOptions.map((language) => <option key={language} value={language}>{language.toUpperCase()}</option>)}
          </select>
        </label>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.listSection} aria-labelledby='challenge-list-title' aria-live='polite'>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>KHÁM PHÁ</p>
              <h2 id='challenge-list-title'>Nhịp học đang có</h2>
            </div>
            {challenges ? <span className={styles.resultCount}>{visibleChallenges.length} thử thách</span> : null}
          </div>
          {listLoading && !challenges ? <Skeleton lines={5} label='Đang tải danh sách thử thách' /> : null}
          {listError ? <ErrorState title='Chưa tải được thử thách' description='Danh sách hiện chưa sẵn sàng. Hãy thử tải lại để xem dữ liệu mới nhất.' onRetry={() => void loadChallenges()} /> : null}
          {!listError && !listLoading && challenges && visibleChallenges.length === 0 ? (
            <EmptyState title='Chưa có thử thách phù hợp' description='Thử đổi bộ lọc hoặc từ khóa. Khi máy chủ có thử thách phù hợp, chúng sẽ xuất hiện ở đây.' icon='compass' />
          ) : null}
          {visibleChallenges.length > 0 ? (
            <div className={styles.cardList}>
              {visibleChallenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} selected={challenge.id === selectedId} onSelect={() => setSelectedId(challenge.id)} />)}
            </div>
          ) : null}
          {listLoading && challenges ? <p className={styles.refreshNote} role='status'>Đang cập nhật danh sách…</p> : null}
        </section>

        <section className={styles.detailSection} aria-label='Chi tiết thử thách'>
          {detailLoading && !detail ? <Skeleton lines={8} label='Đang tải chi tiết thử thách' /> : null}
          {detailError ? <ErrorState title='Chưa tải được chi tiết' description='Không thể xác nhận thông tin thử thách lúc này.' onRetry={() => selectedId ? void loadDetail(selectedId) : undefined} /> : null}
          {!detailLoading && !detailError && detail ? (
            <ChallengeDetailPanel
              detail={detail}
              progress={progress}
              authStatus={authStatus}
              actionLoading={actionLoading}
              actionError={actionError}
              onJoin={() => void handleAction('join')}
              onLeave={() => void handleAction('leave')}
            />
          ) : null}
          {!detailLoading && !detailError && !detail && selectedSummary === null ? <EmptyState title='Chọn một thử thách' description='Chọn một mục trong danh sách để xem mục tiêu, thời hạn và tiến độ.' icon='info' /> : null}
        </section>
      </div>
    </div>
  );
}

function getActionErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'CHALLENGE_EXPIRED') return 'Thử thách đã kết thúc nên không thể cập nhật tham gia.';
  if (error instanceof ApiClientError && error.code === 'CHALLENGE_NOT_AVAILABLE') return 'Thử thách hiện không nhận thêm thay đổi.';
  if (error instanceof ApiClientError && error.code === 'CHALLENGE_NOT_JOINED') return 'Bạn chưa tham gia thử thách này.';
  return 'Chưa thể cập nhật tham gia lúc này. Hãy thử lại sau.';
}
