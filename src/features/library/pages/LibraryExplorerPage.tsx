import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { LibraryFilterDrawer } from '../components/LibraryFilterDrawer';
import { LibraryFilters } from '../components/LibraryFilters';
import { LibraryResourceRow } from '../components/LibraryResourceRow';
import { libraryApi } from '../library.api';
import { LIBRARY_RESOURCE_TYPES, type LibraryFilters as LibraryFilterValues } from '../library.types';
import { getLibrarySearchErrorMessage, useLibrarySearch, type LibrarySearchApiPort } from '../hooks/useLibrarySearch';
import styles from './LibraryExplorerPage.module.css';

interface LibraryExplorerPageProps {
  api?: LibrarySearchApiPort;
  catalogApi?: { listLanguages: (search?: string) => Promise<LanguageCatalogItem[]> };
}

export function LibraryExplorerPage({ api = libraryApi, catalogApi = languageApi }: LibraryExplorerPageProps) {
  return <LibraryExplorerPageView api={api} catalogApi={catalogApi} />;
}

export function LibraryExplorerPageView({
  api = libraryApi,
  catalogApi = languageApi,
}: LibraryExplorerPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(filters.q);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [languageError, setLanguageError] = useState<unknown>(null);
  const search = useLibrarySearch({ api, filters });
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  const loadLanguages = useCallback(async () => {
    setIsLoadingLanguages(true);
    setLanguageError(null);
    try {
      setLanguages(await catalogApi.listLanguages());
    } catch (error) {
      setLanguageError(error);
    } finally {
      setIsLoadingLanguages(false);
    }
  }, [catalogApi]);

  useEffect(() => { void loadLanguages(); }, [loadLanguages]);

  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name=description]');
    const previousDescription = meta?.getAttribute('content');
    document.title = 'Thư viện mở | CongDongNgonNgu.vn';
    meta?.setAttribute('content', 'Khám phá tài nguyên ngôn ngữ đã được xác minh, có nguồn và giấy phép rõ ràng.');
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
    };
  }, []);

  const updateFilter = (key: keyof LibraryFilterValues, value: string) => {
    const next = new URLSearchParams(searchParams);
    const normalized = value.trim();
    if (normalized) next.set(key, normalized);
    else next.delete(key);
    next.delete('cursor');
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['language', 'type', 'topic', 'level', 'cursor'].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilter('q', searchInput);
  };

  const activeFilterCount = [filters.language, filters.type, filters.topic, filters.level].filter(Boolean).length;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Thư viện mở</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>KNOWLEDGE EXPLORER · PHASE 08</p>
          <h1>Tìm đúng từ, đúng ngữ cảnh.</h1>
          <p className={styles.heroDescription}>
            Một thư viện mở cho người học: nội dung ngắn gọn, đã được xác minh, với nguồn gốc và quyền sử dụng có thể kiểm chứng.
          </p>
        </div>
        <div className={styles.heroNote} aria-label='Nguyên tắc thư viện'>
          <span className={styles.heroNoteMark} aria-hidden='true'>01</span>
          <p>Chỉ tài nguyên công khai, đã xác minh và còn đủ điều kiện giấy phép mới xuất hiện trong kết quả.</p>
        </div>
      </header>

      <form className={styles.searchBar} role='search' onSubmit={submitSearch}>
        <Icon name='search' size={20} className={styles.searchIcon} />
        <label htmlFor='library-keyword'>Tìm trong thư viện</label>
        <input
          id='library-keyword'
          type='search'
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder='Tìm từ, câu, ngữ pháp, văn hoá…'
          autoComplete='off'
        />
        <Button type='submit'>Tìm kiếm</Button>
      </form>

      <div className={styles.mobileToolbar}>
        <Button variant='secondary' type='button' onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-controls='library-filter-drawer'>
          <Icon name='menu' size={18} /> Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </Button>
        <span>{search.items.length} kết quả đang hiển thị</span>
      </div>

      <div className={styles.contentGrid}>
        <aside className={styles.desktopFilters} aria-label='Bộ lọc thư viện'>
          <LibraryFilters
            values={filters}
            languages={languages}
            isLoadingLanguages={isLoadingLanguages}
            idPrefix='library-desktop'
            onChange={updateFilter}
            onClear={clearFilters}
          />
          {languageError ? <p className={styles.filterNotice}>Danh mục ngôn ngữ chưa tải được; bạn vẫn có thể tìm kiếm theo nội dung.</p> : null}
        </aside>

        <section className={styles.results} aria-labelledby='library-results-heading' aria-live='polite'>
          <div className={styles.resultsHeading}>
            <div>
              <p className={styles.eyebrow}>PUBLIC REFERENCE INDEX</p>
              <h2 id='library-results-heading'>Tài nguyên đã xác minh</h2>
            </div>
            <span className={styles.resultCount}>{search.items.length} kết quả</span>
          </div>

          {search.isLoading && search.items.length === 0 ? <div className={styles.loadingCard}><Skeleton lines={6} label='Đang tải thư viện' /></div> : null}
          {!search.isLoading && search.error && search.items.length === 0 ? (
            <ErrorState title='Không thể tải thư viện' description={getLibrarySearchErrorMessage(search.error)} onRetry={() => void search.refresh()} />
          ) : null}
          {!search.isLoading && !search.error && search.items.length === 0 ? (
            <EmptyState title='Chưa có tài nguyên phù hợp' description='Thử một từ khoá khác hoặc xoá bớt bộ lọc để mở rộng kết quả.' icon='library' />
          ) : null}

          {search.items.length > 0 ? (
            <div className={styles.resultList}>
              {search.items.map((item) => <LibraryResourceRow key={item.id} item={item} />)}
            </div>
          ) : null}

          {search.error && search.items.length > 0 ? (
            <div className={styles.inlineNotice} role='alert'>
              <span>{getLibrarySearchErrorMessage(search.error)}</span>
              <Button variant='quiet' size='sm' onClick={() => void (search.nextCursor ? search.loadMore() : search.refresh())}>Thử lại</Button>
            </div>
          ) : null}
          {search.nextCursor ? (
            <Button variant='secondary' className={styles.loadMore} loading={search.isLoadingMore} onClick={() => void search.loadMore()}>
              Xem thêm tài nguyên
            </Button>
          ) : null}
        </section>
      </div>

      <LibraryFilterDrawer open={drawerOpen} onClose={closeDrawer}>
        <LibraryFilters
          values={filters}
          languages={languages}
          isLoadingLanguages={isLoadingLanguages}
          idPrefix='library-mobile'
          onChange={updateFilter}
          onClear={clearFilters}
        />
      </LibraryFilterDrawer>
    </div>
  );
}

function readFilters(searchParams: URLSearchParams): LibraryFilterValues {
  const type = searchParams.get('type') ?? '';
  const level = searchParams.get('level') ?? '';
  return {
    q: searchParams.get('q') ?? '',
    language: searchParams.get('language') ?? '',
    type: LIBRARY_RESOURCE_TYPES.includes(type as (typeof LIBRARY_RESOURCE_TYPES)[number]) ? type as LibraryFilterValues['type'] : '',
    topic: searchParams.get('topic') ?? '',
    level: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level) ? level as LibraryFilterValues['level'] : '',
  };
}
