import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Pagination, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Avatar, Badge } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { ExchangeApi } from '../exchange-api';
import {
  EXCHANGE_LEVELS,
  type DiscoveryCandidate,
  type DiscoveryFilters,
  type PartnerDiscoveryApi,
  type TimezoneFilter,
} from '../exchange.types';
import styles from './PartnerDiscoveryPage.module.css';

const PAGE_SIZE = 6;
const DESKTOP_BREAKPOINT = 1024;

interface PartnerDiscoveryPageViewProps {
  api: PartnerDiscoveryApi;
  authenticated: boolean;
  authLoading?: boolean;
}

interface FilterDraft {
  offeredLanguageCodes: string[];
  wantedLanguageCodes: string[];
  preferredPartnerLevels: DiscoveryFilters['preferredPartnerLevels'];
  goalText: string;
  interestText: string;
  timezoneCompatibility: TimezoneFilter;
}

const EMPTY_FILTERS: DiscoveryFilters = {
  offeredLanguageCodes: [],
  wantedLanguageCodes: [],
  preferredPartnerLevels: [],
  matchingGoalCodes: [],
  matchingInterestCodes: [],
  timezoneCompatibility: 'ANY',
};

export function PartnerDiscoveryPage() {
  const { api, status } = useAuth();
  const discoveryApi = useMemo(() => new ExchangeApi(api), [api]);
  return (
    <PartnerDiscoveryPageView
      api={discoveryApi}
      authenticated={status === 'authenticated'}
      authLoading={status === 'loading'}
    />
  );
}

export function PartnerDiscoveryPageView({ api, authenticated, authLoading = false }: PartnerDiscoveryPageViewProps) {
  const [catalog, setCatalog] = useState<LanguageCatalogItem[] | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(createDraft(EMPTY_FILTERS));
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<PartnerDiscoveryApi['discover']>> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [catalogError, setCatalogError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [filterOpen, setFilterOpen] = useState(isDesktopViewport);
  const requestId = useRef(0);

  usePageMetadata();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const syncWithViewport = () => setFilterOpen(media.matches);
    syncWithViewport();
    media.addEventListener('change', syncWithViewport);
    return () => media.removeEventListener('change', syncWithViewport);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setCatalog(null);
      setCatalogError(null);
      return;
    }
    let active = true;
    setCatalogError(null);
    void api.listLanguages()
      .then((languages) => {
        if (active) setCatalog(languages);
      })
      .catch((cause) => {
        if (!active) return;
        setCatalog(null);
        setCatalogError(cause);
      });
    return () => {
      active = false;
    };
  }, [api, authenticated, retryKey]);

  useEffect(() => {
    if (!authenticated) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    void api.discover({ ...filters, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (currentRequest !== requestId.current) return;
        setData(result);
      })
      .catch((cause) => {
        if (currentRequest !== requestId.current) return;
        setData(null);
        setError(cause);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setIsLoading(false);
      });
  }, [api, authenticated, filters, page, retryKey]);

  const activeFilterCount = countActiveFilters(filters);
  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  const applyFilters = useCallback(() => {
    const next: DiscoveryFilters = {
      offeredLanguageCodes: [...draft.offeredLanguageCodes],
      wantedLanguageCodes: [...draft.wantedLanguageCodes],
      preferredPartnerLevels: [...draft.preferredPartnerLevels],
      matchingGoalCodes: splitCodes(draft.goalText),
      matchingInterestCodes: splitCodes(draft.interestText),
      timezoneCompatibility: draft.timezoneCompatibility,
    };
    setFilters(next);
    setPage(1);
  }, [draft]);
  const resetFilters = useCallback(() => {
    setDraft(createDraft(EMPTY_FILTERS));
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Tìm bạn học</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>LANGUAGE EXCHANGE</p>
          <h1>Tìm người cùng học</h1>
          <p className={styles.heroDescription}>
            Ghép những mong muốn học ngôn ngữ tương hỗ để bạn bắt đầu một cuộc trao đổi có chủ đích.
          </p>
        </div>
        <div className={styles.heroMark} aria-hidden='true'>
          <Icon name='arrow-left-right' size={24} />
          <span>Đối ứng trước<br />kết nối sau</span>
        </div>
      </header>

      {authLoading ? (
        <section className={styles.loadingPanel} aria-label='Đang kiểm tra phiên đăng nhập'>
          <Skeleton lines={4} label='Đang chuẩn bị không gian tìm bạn học' />
        </section>
      ) : !authenticated ? (
        <UnauthenticatedState />
      ) : (
        <>
          <aside className={styles.privacyNote} aria-label='Lưu ý riêng tư'>
            <Icon name='lock' size={18} />
            <p><strong>Riêng tư theo lựa chọn của bạn.</strong> Kết quả chỉ dùng ngôn ngữ, mục tiêu và sở thích bạn đã chọn; không hiển thị email, số điện thoại hay lịch cụ thể.</p>
          </aside>

          <div className={styles.workspace}>
            <aside className={styles.filterRail} aria-label='Bộ lọc tìm bạn học'>
              <details
                className={styles.filterDisclosure}
                open={filterOpen}
                onToggle={(event) => setFilterOpen(event.currentTarget.open)}
              >
                <summary>
                  <span><Icon name='chevron-down' size={18} /> Bộ lọc</span>
                  {activeFilterCount > 0 ? <Badge tone='info'>{activeFilterCount} đang dùng</Badge> : null}
                </summary>
                <FilterForm
                  catalog={catalog ?? []}
                  catalogLoading={catalog === null && !catalogError}
                  draft={draft}
                  onDraftChange={setDraft}
                  onApply={applyFilters}
                  onReset={resetFilters}
                />
              </details>
            </aside>

            <section className={styles.results} aria-labelledby='discovery-results-heading' aria-live='polite'>
              <div className={styles.resultsHeader}>
                <div>
                  <p className={styles.eyebrow}>GỢI Ý THEO HỒ SƠ</p>
                  <h2 id='discovery-results-heading'>Những người có thể học cùng</h2>
                </div>
                {data ? <span className={styles.resultCount}>{data.pagination.totalItems} kết quả</span> : null}
              </div>

              {catalogError ? (
                <ErrorState title='Không thể tải bộ lọc ngôn ngữ' description='Danh mục ngôn ngữ chưa sẵn sàng. Thử lại để xem kết quả theo dữ liệu thật.' onRetry={retry} retrying={isLoading} />
              ) : null}
              {error ? (
                <ErrorState title='Không thể tải gợi ý học cùng' description='Kết quả ghép chưa sẵn sàng. Bạn có thể thử lại sau ít phút.' onRetry={retry} retrying={isLoading} />
              ) : null}
              {!catalogError && !error && isLoading && data === null ? (
                <div className={styles.loadingPanel}><Skeleton lines={5} label='Đang tải gợi ý học cùng' /></div>
              ) : null}
              {!catalogError && !error && data && data.candidates.length === 0 && !isLoading ? (
                <EmptyState
                  title='Chưa có người phù hợp'
                  description='Thử bỏ bớt một bộ lọc hoặc hoàn thiện ngôn ngữ bạn cung cấp và muốn học trong hồ sơ của mình.'
                  icon='users'
                />
              ) : null}
              {!catalogError && !error && data && data.candidates.length > 0 ? (
                <>
                  <div className={styles.candidateList}>
                    {data.candidates.map((candidate) => <CandidateCard key={candidate.user.id} candidate={candidate} />)}
                  </div>
                  {data.pagination.totalPages > 1 ? (
                    <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />
                  ) : null}
                </>
              ) : null}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function FilterForm({
  catalog,
  catalogLoading,
  draft,
  onDraftChange,
  onApply,
  onReset,
}: {
  catalog: LanguageCatalogItem[];
  catalogLoading: boolean;
  draft: FilterDraft;
  onDraftChange: (draft: FilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <form className={styles.filterForm} onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <h2 className={styles.desktopFilterTitle}>Bộ lọc</h2>
      <div className={styles.filterIntro}>
        <p>Chọn tín hiệu bạn muốn ưu tiên. Kết quả vẫn giữ nguyên thứ tự xác định.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='offered-language-filter'>Họ có thể hỗ trợ</label>
        <select
          id='offered-language-filter'
          className={styles.multiSelect}
          multiple
          size={Math.min(Math.max(catalog.length, 1), 5)}
          value={draft.offeredLanguageCodes}
          disabled={catalogLoading || catalog.length === 0}
          onChange={(event) => onDraftChange({ ...draft, offeredLanguageCodes: selectedValues(event.currentTarget) })}
          aria-describedby='offered-language-filter-hint'
        >
          {catalog.map((language) => <option key={language.code} value={language.code}>{language.nativeName} · {language.englishName}</option>)}
        </select>
        <p id='offered-language-filter-hint' className={styles.hint}>{catalogLoading ? 'Đang tải danh mục…' : 'Giữ Ctrl hoặc Command để chọn nhiều ngôn ngữ.'}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='wanted-language-filter'>Họ muốn luyện</label>
        <select
          id='wanted-language-filter'
          className={styles.multiSelect}
          multiple
          size={Math.min(Math.max(catalog.length, 1), 5)}
          value={draft.wantedLanguageCodes}
          disabled={catalogLoading || catalog.length === 0}
          onChange={(event) => onDraftChange({ ...draft, wantedLanguageCodes: selectedValues(event.currentTarget) })}
          aria-describedby='wanted-language-filter-hint'
        >
          {catalog.map((language) => <option key={language.code} value={language.code}>{language.nativeName} · {language.englishName}</option>)}
        </select>
        <p id='wanted-language-filter-hint' className={styles.hint}>Lọc theo điều họ đang muốn học.</p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Mức độ mong muốn</legend>
        <div className={styles.levelGrid}>
          {EXCHANGE_LEVELS.map((level) => (
            <label key={level} className={styles.checkOption}>
              <input
                type='checkbox'
                checked={draft.preferredPartnerLevels.includes(level)}
                onChange={() => onDraftChange({
                  ...draft,
                  preferredPartnerLevels: toggleValue(draft.preferredPartnerLevels, level),
                })}
              />
              <span>{level}</span>
            </label>
          ))}
        </div>
        <p className={styles.hint}>Mức độ họ đã chọn cho người học cùng.</p>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor='goal-filter'>Mục tiêu chung</label>
        <input
          id='goal-filter'
          className={styles.textInput}
          value={draft.goalText}
          onChange={(event) => onDraftChange({ ...draft, goalText: event.target.value })}
          placeholder='Ví dụ: conversation, travel'
          autoComplete='off'
        />
        <p className={styles.hint}>Mã mục tiêu, cách nhau bằng dấu phẩy.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='interest-filter'>Sở thích chung</label>
        <input
          id='interest-filter'
          className={styles.textInput}
          value={draft.interestText}
          onChange={(event) => onDraftChange({ ...draft, interestText: event.target.value })}
          placeholder='Ví dụ: music, travel'
          autoComplete='off'
        />
        <p className={styles.hint}>Sở thích trong hồ sơ, cách nhau bằng dấu phẩy.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='timezone-filter'>Múi giờ và thời gian</label>
        <select
          id='timezone-filter'
          className={styles.select}
          value={draft.timezoneCompatibility}
          onChange={(event) => onDraftChange({ ...draft, timezoneCompatibility: event.target.value as TimezoneFilter })}
        >
          <option value='ANY'>Không giới hạn</option>
          <option value='WITHIN_3_HOURS'>Trong khoảng 3 giờ</option>
          <option value='SAME_TIMEZONE'>Cùng múi giờ</option>
        </select>
      </div>

      <div className={styles.filterActions}>
        <Button type='submit' variant='secondary' fullWidth>Áp dụng bộ lọc</Button>
        <Button type='button' variant='quiet' fullWidth onClick={onReset}>Xóa bộ lọc</Button>
      </div>
    </form>
  );
}

function CandidateCard({ candidate }: { candidate: DiscoveryCandidate }) {
  const offered = candidate.languages.filter((language) => language.offered);
  const wanted = candidate.languages.filter((language) => language.wanted);
  return (
    <article className={styles.candidateCard}>
      <header className={styles.candidateHeader}>
        <Avatar name={candidate.user.displayName} size='lg' />
        <div className={styles.candidateIdentity}>
          <div className={styles.identityLine}>
            <h3>{candidate.user.displayName}</h3>
            <Badge tone='success'>Đối ứng</Badge>
          </div>
          <p>Gợi ý dựa trên những điều hai bạn muốn trao đổi.</p>
        </div>
      </header>

      <div className={styles.languageRows}>
        <LanguageRow label='Họ có thể hỗ trợ' languages={offered} />
        <LanguageRow label='Họ muốn luyện' languages={wanted} />
      </div>

      <section className={styles.reasonBlock} aria-label={`Vì sao ${candidate.user.displayName} phù hợp`}>
        <h4>Vì sao phù hợp</h4>
        <ul>
          {candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </section>

      {candidate.goals.length > 0 || candidate.interests.length > 0 ? (
        <dl className={styles.topicSummary}>
          {candidate.goals.length > 0 ? <div><dt>Mục tiêu họ chọn</dt><dd>{candidate.goals.map(topicLabel).join(' · ')}</dd></div> : null}
          {candidate.interests.length > 0 ? <div><dt>Sở thích họ chọn</dt><dd>{candidate.interests.map(topicLabel).join(' · ')}</dd></div> : null}
        </dl>
      ) : null}

      <Link className={styles.profileLink} to={`/profiles/${encodeURIComponent(candidate.user.id)}`}>
        Xem hồ sơ công khai <span aria-hidden='true'>↗</span>
      </Link>
    </article>
  );
}

function LanguageRow({ label, languages }: { label: string; languages: DiscoveryCandidate['languages'] }) {
  return (
    <div className={styles.languageRow}>
      <span className={styles.languageRowLabel}>{label}</span>
      <div className={styles.languageList}>
        {languages.length > 0 ? languages.map((language) => (
          <span className={styles.languageItem} key={`${label}-${language.code}`}>
            <strong>{language.nativeName}</strong>
            <small>{language.englishName} · {proficiencyLabel(language.declaredProficiency)}</small>
          </span>
        )) : <span className={styles.mutedValue}>Chưa có dữ liệu được chọn</span>}
      </div>
    </div>
  );
}

function UnauthenticatedState() {
  return (
    <section className={styles.authPrompt} aria-labelledby='discovery-auth-heading'>
      <div className={styles.authPromptIcon} aria-hidden='true'><Icon name='users' size={24} /></div>
      <div>
        <p className={styles.eyebrow}>MỘT KHÔNG GIAN AN TOÀN</p>
        <h2 id='discovery-auth-heading'>Đăng nhập để tìm người học cùng</h2>
        <p>Bạn sẽ kiểm soát ngôn ngữ, mục tiêu và phần thông tin được dùng cho gợi ý.</p>
        <Link className={styles.primaryLink} to='/login'>Đăng nhập</Link>
      </div>
    </section>
  );
}

function createDraft(filters: DiscoveryFilters): FilterDraft {
  return {
    offeredLanguageCodes: [...filters.offeredLanguageCodes],
    wantedLanguageCodes: [...filters.wantedLanguageCodes],
    preferredPartnerLevels: [...filters.preferredPartnerLevels],
    goalText: filters.matchingGoalCodes.join(', '),
    interestText: filters.matchingInterestCodes.join(', '),
    timezoneCompatibility: filters.timezoneCompatibility,
  };
}

function selectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions, (option) => option.value);
}

function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function splitCodes(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function countActiveFilters(filters: DiscoveryFilters): number {
  return filters.offeredLanguageCodes.length
    + filters.wantedLanguageCodes.length
    + filters.preferredPartnerLevels.length
    + filters.matchingGoalCodes.length
    + filters.matchingInterestCodes.length
    + (filters.timezoneCompatibility === 'ANY' ? 0 : 1);
}

function proficiencyLabel(value: DiscoveryCandidate['languages'][number]['declaredProficiency']): string {
  return value === 'NATIVE' ? 'bản ngữ' : value;
}

function topicLabel(value: string): string {
  const labels: Record<string, string> = {
    conversation: 'Hội thoại',
    travel: 'Du lịch',
    work: 'Công việc',
    exam: 'Thi cử',
    culture: 'Văn hóa',
    music: 'Âm nhạc',
    films: 'Phim ảnh',
    books: 'Sách',
    food: 'Ẩm thực',
    technology: 'Công nghệ',
  };
  return labels[value] ?? value.replace(/[-_]+/g, ' ');
}

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches
    : window.innerWidth >= DESKTOP_BREAKPOINT;
}

function usePageMetadata() {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    const canonical = document.querySelector('link[rel="canonical"]') ?? document.createElement('link');
    const createdCanonical = !canonical.parentNode;
    const previousCanonical = canonical.getAttribute('href');
    if (createdCanonical) document.head.appendChild(canonical);
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', new URL('/exchange', window.location.origin).toString());
    document.title = 'Tìm bạn học ngôn ngữ | CongDongNgonNgu.vn';
    meta?.setAttribute('content', 'Tìm người học cùng dựa trên ngôn ngữ trao đổi và mục tiêu chung.');
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
      if (createdCanonical) canonical.remove();
      else if (previousCanonical !== null) canonical.setAttribute('href', previousCanonical);
    };
  }, []);
}
