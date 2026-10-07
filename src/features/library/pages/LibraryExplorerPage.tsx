import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { useAuth } from '../../auth/AuthProvider';
import { LibraryFilterDrawer } from '../components/LibraryFilterDrawer';
import { LibraryFilters } from '../components/LibraryFilters';
import { LibraryResourceRow } from '../components/LibraryResourceRow';
import { libraryApi } from '../library.api';
import { LIBRARY_RESOURCE_TYPES, type LibraryFilters as LibraryFilterValues } from '../library.types';
import { useLibrarySearch, type LibrarySearchApiPort } from '../hooks/useLibrarySearch';
import { librarySearchErrorKey } from '../library.errors';
import styles from './LibraryExplorerPage.module.css';

interface LibraryExplorerPageProps {
  api?: LibrarySearchApiPort;
  catalogApi?: { listLanguages: (search?: string) => Promise<LanguageCatalogItem[]> };
  showReviewerEntry?: boolean;
}

export function LibraryExplorerPage({ api = libraryApi, catalogApi = languageApi }: LibraryExplorerPageProps) {
  const { user } = useAuth();
  const showReviewerEntry = Boolean(user?.roles.some((role) => role === 'MODERATOR' || role === 'ADMIN'));
  return <LibraryExplorerPageView api={api} catalogApi={catalogApi} showReviewerEntry={showReviewerEntry} />;
}

export function LibraryExplorerPageView({
  api = libraryApi,
  catalogApi = languageApi,
  showReviewerEntry = false,
}: LibraryExplorerPageProps) {
  const { t } = useUiLocale();
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
    document.title = t('library.documentTitle');
    meta?.setAttribute('content', t('library.documentDescription'));
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
    };
  }, [t]);

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
      <nav className={styles.breadcrumbs} aria-label={t('library.breadcrumb')}>
        <Link to='/'>{t('library.home')}</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{t('library.name')}</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{t('library.explorerEyebrow')}</p>
          <h1>{t('library.heroTitle')}</h1>
          <p className={styles.heroDescription}>
            {t('library.heroDescription')}
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.contributeLink} to='/library/contribute'>{t('library.contribute')} <span aria-hidden='true'>↗</span></Link>
            {showReviewerEntry ? <Link className={styles.reviewLink} to='/library/review?view=pending'>{t('library.reviewQueue')} <span aria-hidden='true'>↗</span></Link> : null}
          </div>
        </div>
        <div className={styles.heroNote} aria-label={t('library.principles')}>
          <span className={styles.heroNoteMark} aria-hidden='true'>01</span>
          <p>{t('library.publicPolicy')}</p>
        </div>
      </header>

      <form className={styles.searchBar} role='search' onSubmit={submitSearch}>
        <Icon name='search' size={20} className={styles.searchIcon} />
        <label htmlFor='library-keyword'>{t('library.searchLabel')}</label>
        <input
          id='library-keyword'
          type='search'
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('library.searchPlaceholder')}
          autoComplete='off'
        />
        <Button type='submit'>{t('library.search')}</Button>
      </form>

      <div className={styles.mobileToolbar}>
        <Button variant='secondary' type='button' onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-controls='library-filter-drawer'>
          <Icon name='menu' size={18} /> {t('library.filters')}{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </Button>
        <span>{t('library.visibleResults', { count: search.items.length })}</span>
      </div>

      <div className={styles.contentGrid}>
        <aside className={styles.desktopFilters} aria-label={t('library.filtersLabel')}>
          <LibraryFilters
            values={filters}
            languages={languages}
            isLoadingLanguages={isLoadingLanguages}
            idPrefix='library-desktop'
            onChange={updateFilter}
            onClear={clearFilters}
          />
          {languageError ? <p className={styles.filterNotice}>{t('library.languageUnavailable')}</p> : null}
        </aside>

        <section className={styles.results} aria-labelledby='library-results-heading' aria-live='polite'>
          <div className={styles.resultsHeading}>
            <div>
              <p className={styles.eyebrow}>{t('library.publicIndex')}</p>
              <h2 id='library-results-heading'>{t('library.resultsHeading')}</h2>
            </div>
            <span className={styles.resultCount}>{t('library.resultsCount', { count: search.items.length })}</span>
          </div>

          {search.isLoading && search.items.length === 0 ? <div className={styles.loadingCard}><Skeleton lines={6} label={t('library.loading')} /></div> : null}
          {!search.isLoading && search.error && search.items.length === 0 ? (
            <ErrorState title={t('library.loadError')} description={t(librarySearchErrorKey(search.error))} onRetry={() => void search.refresh()} />
          ) : null}
          {!search.isLoading && !search.error && search.items.length === 0 ? (
            <EmptyState title={t('library.empty')} description={t('library.emptyDescription')} icon='library' />
          ) : null}

          {search.items.length > 0 ? (
            <div className={styles.resultList}>
              {search.items.map((item) => <LibraryResourceRow key={item.id} item={item} />)}
            </div>
          ) : null}

          {search.error && search.items.length > 0 ? (
            <div className={styles.inlineNotice} role='alert'>
              <span>{t(librarySearchErrorKey(search.error))}</span>
              <Button variant='quiet' size='sm' onClick={() => void (search.nextCursor ? search.loadMore() : search.refresh())}>{t('library.retry')}</Button>
            </div>
          ) : null}
          {search.nextCursor ? (
            <Button variant='secondary' className={styles.loadMore} loading={search.isLoadingMore} onClick={() => void search.loadMore()}>
              {t('library.loadMore')}
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
