import { matchingReasonDisplay } from '../exchange-reasons';
import { goalDisplay } from '../exchange-copy';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { languageDisplayName } from '../../ui-locale/language-display';
import { translate, type UiLocale } from '../../ui-locale/ui-locale';
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
  const { t, locale, formatNumber } = useUiLocale();
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

  usePageMetadata(locale);

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
      <nav className={styles.breadcrumbs} aria-label={t('exchange.breadcrumb')}>
        <Link to='/'>{t('exchange.home')}</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{t('exchange.browse')}</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{t('exchange.exchange')}</p>
          <h1>{t('exchange.browseTitle')}</h1>
          <p className={styles.heroDescription}>
            {t('exchange.browseIntro')}
          </p>
          {authenticated && <Link to='/exchange/connections'>{t('exchange.connections.title')}</Link>}
        </div>
        <div className={styles.heroMark} aria-hidden='true'>
          <Icon name='arrow-left-right' size={24} />
          <span>{t('exchange.reciprocalFirst')}<br />{t('exchange.connectLater')}</span>
        </div>
      </header>

      {authLoading ? (
        <section className={styles.loadingPanel} aria-label={t('exchange.sessionLoading')}>
          <Skeleton lines={4} label={t('exchange.browsePreparing')} />
        </section>
      ) : !authenticated ? (
        <UnauthenticatedState />
      ) : (
        <>
          <aside className={styles.privacyNote} aria-label={t('exchange.privacyLabel')}>
            <Icon name='lock' size={18} />
            <p><strong>{t('exchange.privacyTitle')}</strong> {t('exchange.privacyDescription')}</p>
          </aside>

          <div className={styles.workspace}>
            <aside className={styles.filterRail} aria-label={t('exchange.filtersLabel')}>
              <details
                className={styles.filterDisclosure}
                open={filterOpen}
                onToggle={(event) => setFilterOpen(event.currentTarget.open)}
              >
                <summary>
                  <span><Icon name='chevron-down' size={18} /> {t('exchange.filters')}</span>
                  {activeFilterCount > 0 ? <Badge tone='info'>{formatNumber(activeFilterCount)} {t('exchange.activeSuffix')}</Badge> : null}
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
                  <p className={styles.eyebrow}>{t('exchange.suggestionsEyebrow')}</p>
                  <h2 id='discovery-results-heading'>{t('exchange.suggestionsTitle')}</h2>
                </div>
                {data ? <span className={styles.resultCount}>{formatNumber(data.pagination.totalItems)} {t('exchange.resultsSuffix')}</span> : null}
              </div>

              {catalogError ? (
                <ErrorState title={t('exchange.catalogErrorTitle')} description={t('exchange.catalogErrorDescription')} onRetry={retry} retrying={isLoading} />
              ) : null}
              {error ? (
                <ErrorState title={t('exchange.browseErrorTitle')} description={t('exchange.browseErrorDescription')} onRetry={retry} retrying={isLoading} />
              ) : null}
              {!catalogError && !error && isLoading && data === null ? (
                <div className={styles.loadingPanel}><Skeleton lines={5} label={t('exchange.browseLoading')} /></div>
              ) : null}
              {!catalogError && !error && data && data.candidates.length === 0 && !isLoading ? (
                <EmptyState
                  title={t('exchange.emptyTitle')}
                  description={t('exchange.emptyDescription')}
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
  const { t, locale } = useUiLocale();
  return (
    <form className={styles.filterForm} onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <h2 className={styles.desktopFilterTitle}>{t('exchange.filters')}</h2>
      <div className={styles.filterIntro}>
        <p>{t('exchange.filterIntro')}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='offered-language-filter'>{t('exchange.theyOffer')}</label>
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
          {catalog.map((language) => <option key={language.code} value={language.code}>{languageDisplayName(language, locale)}</option>)}
        </select>
        <p id='offered-language-filter-hint' className={styles.hint}>{catalogLoading ? t('exchange.catalogLoading') : t('exchange.multiSelectHint')}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='wanted-language-filter'>{t('exchange.theyWant')}</label>
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
          {catalog.map((language) => <option key={language.code} value={language.code}>{languageDisplayName(language, locale)}</option>)}
        </select>
        <p id='wanted-language-filter-hint' className={styles.hint}>{t('exchange.wantedHint')}</p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>{t('exchange.preferredLevel')}</legend>
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
        <p className={styles.hint}>{t('exchange.preferredLevelHint')}</p>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor='goal-filter'>{t('exchange.sharedGoals')}</label>
        <input
          id='goal-filter'
          className={styles.textInput}
          value={draft.goalText}
          onChange={(event) => onDraftChange({ ...draft, goalText: event.target.value })}
          placeholder={t('exchange.goalsPlaceholder')}
          autoComplete='off'
        />
        <p className={styles.hint}>{t('exchange.goalsHint')}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='interest-filter'>{t('exchange.sharedInterests')}</label>
        <input
          id='interest-filter'
          className={styles.textInput}
          value={draft.interestText}
          onChange={(event) => onDraftChange({ ...draft, interestText: event.target.value })}
          placeholder={t('exchange.interestsPlaceholder')}
          autoComplete='off'
        />
        <p className={styles.hint}>{t('exchange.interestsHint')}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor='timezone-filter'>{t('exchange.timezoneFilter')}</label>
        <select
          id='timezone-filter'
          className={styles.select}
          value={draft.timezoneCompatibility}
          onChange={(event) => onDraftChange({ ...draft, timezoneCompatibility: event.target.value as TimezoneFilter })}
        >
          <option value='ANY'>{t('exchange.timezoneAny')}</option>
          <option value='WITHIN_3_HOURS'>{t('exchange.timezoneWithin')}</option>
          <option value='SAME_TIMEZONE'>{t('exchange.timezoneSame')}</option>
        </select>
      </div>

      <div className={styles.filterActions}>
        <Button type='submit' variant='secondary' fullWidth>{t('exchange.apply')}</Button>
        <Button type='button' variant='quiet' fullWidth onClick={onReset}>{t('exchange.reset')}</Button>
      </div>
    </form>
  );
}

function CandidateCard({ candidate }: { candidate: DiscoveryCandidate }) {
  const { t, locale } = useUiLocale();
  const offered = candidate.languages.filter((language) => language.offered);
  const wanted = candidate.languages.filter((language) => language.wanted);
  return (
    <article className={styles.candidateCard}>
      <header className={styles.candidateHeader}>
        <Avatar name={candidate.user.displayName} size='lg' />
        <div className={styles.candidateIdentity}>
          <div className={styles.identityLine}>
            <h3>{candidate.user.displayName}</h3>
            <Badge tone='success'>{t('exchange.reciprocal')}</Badge>
          </div>
          <p>{t('exchange.candidateIntro')}</p>
        </div>
      </header>

      <div className={styles.languageRows}>
        <LanguageRow label={t('exchange.theyOffer')} languages={offered} />
        <LanguageRow label={t('exchange.theyWant')} languages={wanted} />
      </div>

      <section className={styles.reasonBlock} aria-label={t('exchange.whyName', { name: candidate.user.displayName })}>
        <h4>{t('exchange.why')}</h4>
        <ul>
          {candidate.reasons.map((reason) => <li key={reason}>{matchingReasonDisplay(reason, candidate.languages, locale)}</li>)}
        </ul>
      </section>

      {candidate.goals.length > 0 || candidate.interests.length > 0 ? (
        <dl className={styles.topicSummary}>
          {candidate.goals.length > 0 ? <div><dt>{t('exchange.chosenGoals')}</dt><dd>{candidate.goals.map((value) => goalDisplay(value, locale)).join(' · ')}</dd></div> : null}
          {candidate.interests.length > 0 ? <div><dt>{t('exchange.chosenInterests')}</dt><dd>{candidate.interests.join(' · ')}</dd></div> : null}
        </dl>
      ) : null}

      <Link className={styles.profileLink} to={`/exchange/profile/${encodeURIComponent(candidate.user.id)}`}>
        {t('exchange.viewProfile')} <span aria-hidden='true'>↗</span>
      </Link>
    </article>
  );
}

function LanguageRow({ label, languages }: { label: string; languages: DiscoveryCandidate['languages'] }) {
  const { t, locale } = useUiLocale();
  return (
    <div className={styles.languageRow}>
      <span className={styles.languageRowLabel}>{label}</span>
      <div className={styles.languageList}>
        {languages.length > 0 ? languages.map((language) => (
          <span className={styles.languageItem} key={`${label}-${language.code}`}>
            <strong>{language.nativeName}</strong>
            <small>{languageDisplayName(language, locale)} · {language.declaredProficiency === 'NATIVE' ? t('exchange.native') : language.declaredProficiency}</small>
          </span>
        )) : <span className={styles.mutedValue}>{t('exchange.noLanguage')}</span>}
      </div>
    </div>
  );
}

function UnauthenticatedState() {
  const { t } = useUiLocale();
  return (
    <section className={styles.authPrompt} aria-labelledby='discovery-auth-heading'>
      <div className={styles.authPromptIcon} aria-hidden='true'><Icon name='users' size={24} /></div>
      <div>
        <p className={styles.eyebrow}>{t('exchange.safeSpace')}</p>
        <h2 id='discovery-auth-heading'>{t('exchange.loginTitle')}</h2>
        <p>{t('exchange.loginDescription')}</p>
        <Link className={styles.primaryLink} to='/login'>{t('exchange.login')}</Link>
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

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches
    : window.innerWidth >= DESKTOP_BREAKPOINT;
}

function usePageMetadata(locale: UiLocale) {
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
    document.title = translate(locale, 'exchange.metaTitle');
    meta?.setAttribute('content', translate(locale, 'exchange.metaDescription'));
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
      if (createdCanonical) canonical.remove();
      else if (previousCanonical !== null) canonical.setAttribute('href', previousCanonical);
    };
  }, [locale]);
}
