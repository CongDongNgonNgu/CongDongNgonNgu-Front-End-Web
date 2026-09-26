import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../../components/ui/Feedback';
import { SelectControl } from '../../../../components/ui/FormControls/SelectControl';
import { LIBRARY_RESOURCE_TYPES, type LibraryResourceType } from '../../library.types';
import { getLibraryReviewErrorMessage } from '../library-review.errors';
import type {
  LibraryInvalidSourceQueueItem,
  LibraryReviewApiPort,
  LibraryReviewQueueItem,
} from '../library-review.types';
import { useLibraryReviewQueue } from '../hooks/useLibraryReviewQueue';
import styles from './LibraryReviewQueue.module.css';

interface LibraryReviewQueueProps {
  api: LibraryReviewApiPort;
}

const resourceTypeLabels: Record<LibraryResourceType, string> = {
  VOCABULARY: 'Từ vựng',
  SENTENCE: 'Câu mẫu',
  TRANSLATION: 'Bản dịch',
  GRAMMAR_ITEM: 'Ngữ pháp',
  DIALOGUE: 'Hội thoại',
  IDIOM: 'Thành ngữ',
  SLANG: 'Tiếng lóng',
  CULTURAL_NOTE: 'Văn hoá',
  PRONUNCIATION: 'Phát âm',
  LEARNING_COLLECTION: 'Bộ sưu tập',
};

const eligibilityLabels: Record<string, string> = {
  PROVENANCE_REQUIRED: 'Thiếu bằng chứng nguồn gốc',
  LICENSE_UNKNOWN: 'Không xác định được giấy phép',
  LICENSE_INACTIVE: 'Giấy phép không còn hoạt động',
  LICENSE_REDISTRIBUTION_UNSAFE: 'Giấy phép không cho phép tái phân phối',
  MODERATION_INACTIVE: 'Nội dung chưa ở trạng thái hoạt động',
  SOURCE_INVALID: 'Nguồn hiện không còn hợp lệ',
};

const sourceHealthLabels: Record<string, string> = {
  VALID: 'Nguồn hiện hợp lệ',
  CANDIDATE_INVALIDATED: 'Ứng viên nguồn đã bị vô hiệu hóa',
  CANDIDATE_MISSING: 'Không còn tìm thấy ứng viên nguồn',
  ACCEPTANCE_REVOKED_OR_REPLACED: 'Xác nhận nguồn đã bị thu hồi hoặc thay thế',
  RESPONSE_INACTIVE_OR_MISSING: 'Phản hồi nguồn không còn hoạt động',
  PARENT_INACTIVE_OR_MISSING: 'Bài nguồn không còn hoạt động',
  PARENT_NOT_PUBLIC: 'Bài nguồn không còn công khai',
  SOURCE_REFERENCE_MISMATCH: 'Liên kết nguồn không còn nhất quán',
};

export function LibraryReviewQueue({ api }: LibraryReviewQueueProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('view') === 'source-invalid' ? 'source-invalid' : 'pending';
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const query = useMemo(() => ({
    q: searchParams.get('q') ?? '',
    language: searchParams.get('language') ?? '',
    type: (searchParams.get('type') ?? '') as LibraryResourceType | '',
  }), [searchParams]);
  const queue = useLibraryReviewQueue({ api, mode, query, pageSize: 12 });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    const normalized = value.trim();
    if (normalized) next.set(key, normalized);
    else next.delete(key);
    next.delete('cursor');
    setSearchParams(next, { replace: true });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam('q', searchInput);
  };

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><Link to='/library'>Thư viện mở</Link><span aria-hidden='true'>/</span><span aria-current='page'>Kiểm duyệt</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LIBRARY REVIEW · PHASE 08</p>
          <h1>Đọc kỹ bằng chứng, xử lý có trách nhiệm.</h1>
          <p className={styles.lede}>Hàng chờ dành cho người kiểm duyệt được uỷ quyền. Nội dung và nguồn gốc là trung tâm; mỗi quyết định đều được ghi lại.</p>
        </div>
        <aside className={styles.headerNote} aria-label='Nguyên tắc kiểm duyệt'>
          <span className={styles.noteNumber}>01</span>
          <p>Chỉ xác minh khi mọi điều kiện công khai hiện tại vẫn hợp lệ.</p>
        </aside>
      </header>

      <nav className={styles.queueTabs} aria-label='Các hàng chờ kiểm duyệt'>
        <Link className={mode === 'pending' ? styles.activeTab : ''} to='/library/review?view=pending' aria-current={mode === 'pending' ? 'page' : undefined}>Đang chờ xem xét</Link>
        <Link className={mode === 'source-invalid' ? styles.activeTab : ''} to='/library/review?view=source-invalid' aria-current={mode === 'source-invalid' ? 'page' : undefined}>Nguồn không còn hợp lệ</Link>
      </nav>

      {mode === 'pending' ? (
        <form className={styles.filters} role='search' onSubmit={submitSearch}>
          <label className={styles.searchField}>
            <span>Từ khóa</span>
            <input aria-label='Từ khóa trong hàng chờ' type='search' value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder='Tìm nội dung hoặc ngữ cảnh' />
          </label>
          <label className={styles.searchField}>
            <span>Ngôn ngữ</span>
            <input aria-label='Ngôn ngữ trong hàng chờ' value={query.language} onChange={(event) => updateParam('language', event.target.value)} placeholder='vi, en…' />
          </label>
          <SelectControl label='Loại tài nguyên' aria-label='Loại tài nguyên trong hàng chờ' value={query.type} onChange={(event) => updateParam('type', event.target.value)}>
            <option value=''>Tất cả loại</option>
            {LIBRARY_RESOURCE_TYPES.map((type) => <option key={type} value={type}>{resourceTypeLabels[type]}</option>)}
          </SelectControl>
          <Button type='submit' variant='secondary'>Lọc hàng chờ</Button>
        </form>
      ) : (
        <div className={styles.invalidNotice} role='note'>
          <strong>Đang ẩn khỏi thư viện công khai</strong>
          <span>Nguồn Phase 06 cần được đối soát trước khi tài nguyên có thể xuất hiện lại.</span>
        </div>
      )}

      <main className={styles.results} aria-labelledby='review-queue-heading' aria-live='polite'>
        <div className={styles.resultsHeading}>
          <div><p className={styles.eyebrow}>{mode === 'pending' ? 'PENDING COMMUNITY REVIEW' : 'SOURCE HEALTH'}</p><h2 id='review-queue-heading'>{mode === 'pending' ? 'Tài nguyên cần một quyết định' : 'Tài nguyên đã bị ẩn khỏi công khai'}</h2></div>
          <span className={styles.resultCount}>{queue.items.length} mục đã tải</span>
        </div>

        {queue.isLoading ? <div className={styles.loadingCard}><Skeleton lines={7} label='Đang tải hàng chờ kiểm duyệt' /></div> : null}
        {!queue.isLoading && queue.error && queue.items.length === 0 ? <ErrorState title='Không thể tải hàng chờ' description={getLibraryReviewErrorMessage(queue.error)} onRetry={() => void queue.refresh()} retrying={queue.isLoading} /> : null}
        {!queue.isLoading && !queue.error && queue.items.length === 0 ? <EmptyState title={mode === 'pending' ? 'Hàng chờ đang trống' : 'Chưa có nguồn cần đối soát'} description={mode === 'pending' ? 'Mọi tài nguyên hiện đã được xử lý hoặc chưa có mục mới.' : 'Không có tài nguyên VERIFIED nào đang có nguồn Phase 06 không hợp lệ.'} icon='inbox' /> : null}

        {queue.items.length > 0 ? <div className={styles.queueList}>{queue.items.map((item) => mode === 'pending' ? <PendingQueueRow key={item.resourceId} item={item as LibraryReviewQueueItem} /> : <InvalidSourceRow key={item.resourceId} item={item as LibraryInvalidSourceQueueItem} />)}</div> : null}
        {queue.error && queue.items.length > 0 ? <div className={styles.inlineError} role='alert'><span>{getLibraryReviewErrorMessage(queue.error)}</span><Button variant='quiet' size='sm' onClick={() => void queue.loadMore()}>Thử lại</Button></div> : null}
        {queue.nextCursor ? <Button className={styles.loadMore} variant='secondary' loading={queue.isLoadingMore} onClick={() => void queue.loadMore()}>Xem thêm</Button> : null}
      </main>
    </div>
  );
}

function PendingQueueRow({ item }: { item: LibraryReviewQueueItem }) {
  const issues = item.verificationEligibility.issues;
  return (
    <Link className={styles.queueRow} to={`/library/review/${encodeURIComponent(item.resourceId)}`}>
      <div className={styles.rowMain}>
        <div className={styles.rowMeta}><span className={styles.typeBadge}>{resourceTypeLabels[item.resourceType]}</span><span>{item.primaryLanguageCode.toUpperCase()}{item.secondaryLanguageCode ? ` · ${item.secondaryLanguageCode.toUpperCase()}` : ''}</span>{item.cefrLevel ? <span>CEFR {item.cefrLevel}</span> : null}</div>
        <h3>{item.preview.title}</h3>
        <p>{item.preview.excerpt}</p>
        {item.topics.length > 0 ? <div className={styles.topicList}>{item.topics.map((topic) => <span key={topic}>#{topic}</span>)}</div> : null}
      </div>
      <div className={styles.rowAside}>
        <span className={styles.pendingBadge}>Đang xem xét</span>
        <span className={issues.length === 0 ? styles.healthyText : styles.warningText}>{issues.length === 0 ? 'Đủ điều kiện sơ bộ' : issues.map((issue) => eligibilityLabels[issue] ?? issue).join(' · ')}</span>
        <span className={styles.rowArrow} aria-hidden='true'>↗</span>
      </div>
    </Link>
  );
}

function InvalidSourceRow({ item }: { item: LibraryInvalidSourceQueueItem }) {
  const reasons = item.sourceHealth.filter((health) => health.applicable && !health.valid).map((health) => health.reason ? sourceHealthLabels[health.reason] ?? health.reason : 'Nguồn không còn hợp lệ');
  return (
    <Link className={`${styles.queueRow} ${styles.invalidRow}`} to={`/library/review/${encodeURIComponent(item.resourceId)}`}>
      <div className={styles.rowMain}>
        <div className={styles.rowMeta}><span className={styles.typeBadge}>{resourceTypeLabels[item.resourceType]}</span><span>{item.primaryLanguageCode.toUpperCase()}</span><span>VERIFIED</span></div>
        <h3>{item.preview.title}</h3>
        <p>{item.preview.excerpt}</p>
      </div>
      <div className={styles.rowAside}>
        <span className={styles.hiddenBadge}>Đang ẩn khỏi thư viện công khai</span>
        <span className={styles.warningText}>{reasons.join(' · ')}</span>
        <span className={styles.rowArrow} aria-hidden='true'>↗</span>
      </div>
    </Link>
  );
}
