import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Badge } from '../../../components/ui/Surface';
import { useAuth, type AuthStatus } from '../../auth/AuthProvider';
import { createEventApi, eventApi, type EventApi } from '../event.api';
import type { EventPublicSummary, EventStateFilter } from '../event.types';
import { EventCard } from '../components/EventCard';
import styles from './EventDiscoveryPage.module.css';

interface EventDiscoveryPageViewProps {
  api?: EventApi;
  authStatus: AuthStatus;
}

export function EventDiscoveryPage() {
  const auth = useAuth();
  const api = useMemo(() => createEventApi(auth.api), [auth.api]);
  return <EventDiscoveryPageView api={api} authStatus={auth.status} />;
}

export function EventDiscoveryPageView({ api = eventApi }: EventDiscoveryPageViewProps) {
  const [stateFilter, setStateFilter] = useState<EventStateFilter>('ALL');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<EventPublicSummary[] | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  const [listLoading, setListLoading] = useState(true);
  const requestId = useRef(0);

  const loadEvents = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const result = await api.list({
        state: stateFilter,
        languageCode: languageFilter === 'ALL' ? undefined : languageFilter,
        limit: 50,
      });
      if (currentRequestId !== requestId.current) return;
      setEvents(result);
    } catch (cause) {
      if (currentRequestId !== requestId.current) return;
      setEvents(null);
      setListError(cause);
    } finally {
      if (currentRequestId === requestId.current) setListLoading(false);
    }
  }, [api, languageFilter, stateFilter]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    if (!events || !query) return events ?? [];
    return events.filter((event) => [
      event.title,
      event.topic ?? '',
      event.languageCode,
      event.level ?? '',
      event.venueType,
    ].some((value) => value.toLocaleLowerCase('vi-VN').includes(query)));
  }, [events, search]);

  const languageOptions = useMemo(
    () => [...new Set((events ?? []).map((event) => event.languageCode))].sort(),
    [events],
  );

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Sự kiện</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>NHỊP CỘNG ĐỒNG · PHASE 14E</p>
          <h1>Gặp nhau để dùng ngôn ngữ trong đời thật.</h1>
          <p className={styles.heroDescription}>
            Tìm một cuộc trò chuyện vừa sức, xem rõ giờ địa phương và gặp những người đang học cùng bạn.
          </p>
        </div>
        <aside className={styles.heroNote} aria-label='Nguyên tắc hiển thị sự kiện'>
          <Badge tone='info'>Dữ liệu từ máy chủ</Badge>
          <h2>Rõ giờ. Rõ quyền. Rõ nhịp gặp.</h2>
          <p>Trạng thái đăng ký, sức chứa và quyền vào phòng nói luôn do máy chủ xác nhận.</p>
          <span className={styles.noteLine}><Icon name='shield-check' size={18} />Không suy diễn số chỗ còn lại từ dữ liệu thiếu.</span>
        </aside>
      </header>

      <section className={styles.toolbar} aria-label='Bộ lọc sự kiện'>
        <label className={styles.searchField}>
          <Icon name='search' size={18} />
          <span className={styles.visuallyHidden}>Tìm sự kiện</span>
          <input aria-label='Tìm sự kiện' type='search' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Tìm theo tên, chủ đề hoặc ngôn ngữ' />
        </label>
        <label className={styles.filterField}>
          <span>Trạng thái</span>
          <select aria-label='Lọc trạng thái sự kiện' value={stateFilter} onChange={(event) => setStateFilter(event.target.value as EventStateFilter)}>
            <option value='ALL'>Tất cả trạng thái</option>
            <option value='UPCOMING'>Sắp diễn ra</option>
            <option value='LIVE'>Đang diễn ra</option>
            <option value='ENDED'>Đã kết thúc</option>
            <option value='CANCELLED'>Đã hủy</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Ngôn ngữ</span>
          <select aria-label='Lọc ngôn ngữ sự kiện' value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
            <option value='ALL'>Tất cả ngôn ngữ</option>
            {languageOptions.map((language) => <option key={language} value={language}>{language.toUpperCase()}</option>)}
          </select>
        </label>
      </section>

      <section className={styles.listSection} aria-labelledby='event-list-title' aria-live='polite'>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>KHÁM PHÁ</p>
            <h2 id='event-list-title'>Những cuộc gặp sắp tới</h2>
          </div>
          {events ? <span className={styles.resultCount}>{visibleEvents.length} sự kiện</span> : null}
        </div>

        {listLoading && !events ? <Skeleton lines={6} label='Đang tải danh sách sự kiện' /> : null}
        {listError ? <ErrorState title='Chưa tải được danh sách sự kiện' description={getListErrorDescription()} onRetry={() => void loadEvents()} /> : null}
        {!listError && !listLoading && events && visibleEvents.length === 0 ? (
          <EmptyState title='Chưa có sự kiện phù hợp' description='Thử đổi bộ lọc hoặc từ khóa. Khi có cuộc gặp phù hợp, chúng sẽ xuất hiện ở đây.' icon='calendar-check' />
        ) : null}
        {visibleEvents.length > 0 ? <div className={styles.cardList}>{visibleEvents.map((event) => <EventCard key={event.id} event={event} />)}</div> : null}
        {listLoading && events ? <p className={styles.refreshNote} role='status'>Đang cập nhật danh sách…</p> : null}
      </section>
    </div>
  );
}

function getListErrorDescription(): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Bạn có thể đang ngoại tuyến. Kiểm tra kết nối rồi thử tải lại để nhận dữ liệu mới nhất.';
  }
  return 'Danh sách hiện chưa sẵn sàng. Hãy thử tải lại để xem dữ liệu mới nhất.';
}
