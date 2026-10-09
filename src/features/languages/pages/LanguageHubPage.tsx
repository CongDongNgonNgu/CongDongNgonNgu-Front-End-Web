import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { ApiClientError } from '../../../services/api-client';
import { languageApi } from '../api/language-api';
import { LanguageHubRemainingJourneys } from '../components/LanguageHubRemainingJourneys';
import { LanguageHubCoreJourneys } from '../components/LanguageHubCoreJourneys';
import { buildHubJourneys, buildHubSocialJourneys } from '../domain/hub-journeys';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { buildLanguageHubSearch, normalizeLanguageHubTopic, parseLanguageHubSearch } from '../domain/language-filters';
import { CEFR_LEVELS, type CefrLevel, type LanguageCatalogItem, type LanguageHubFilters, type LanguageHubOverview } from '../languages.types';
import styles from './LanguageHubPage.module.css';

export interface LanguageHubApi {
  getLanguage: (slug: string) => Promise<LanguageCatalogItem>;
  getOverview: (slug: string, filters: LanguageHubFilters) => Promise<LanguageHubOverview>;
}

interface LanguageHubPageProps {
  api?: LanguageHubApi;
}


export function LanguageHubPage({ api = languageApi }: LanguageHubPageProps) {
  const { t } = useUiLocale();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const routeSlug = typeof slug === 'string' ? slug : '';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<HubLoadState>({ status: 'loading' });
  const search = searchParams.toString();
  const parsed = useMemo(() => parseLanguageHubSearch(search), [search]);
  const filters = useMemo<LanguageHubFilters>(() => parsed.issue ? { levels: [], topic: null } : { levels: parsed.levels, topic: parsed.topic }, [parsed.issue, parsed.levels, parsed.topic]);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState({ status: 'loading' });
    try {
      const [language, overview] = await Promise.all([
        api.getLanguage(routeSlug),
        api.getOverview(routeSlug, filters),
      ]);
      if (currentRequest === requestId.current) setState({ status: 'ready', language, overview });
    } catch (cause) {
      if (currentRequest === requestId.current) setState({ status: 'error', cause });
    }
  }, [api, filters, routeSlug]);

  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load, retryKey]);

  useEffect(() => {
    if (state.status !== 'ready') return undefined;
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    const canonical = document.querySelector('link[rel="canonical"]') ?? document.createElement('link');
    const createdCanonical = !canonical.parentNode;
    const previousCanonical = canonical.getAttribute('href');
    if (createdCanonical) document.head.appendChild(canonical);
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', new URL(state.overview.seo.canonicalPath, window.location.origin).toString());
    document.title = t('hub.seoTitle', { language: state.language.nativeName });
    meta?.setAttribute('content', t('hub.seoDescription', { language: state.language.nativeName }));
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
      if (createdCanonical) canonical.remove();
      else if (previousCanonical !== null) canonical.setAttribute('href', previousCanonical);
    };
  }, [state, t]);

  useEffect(() => {
    if (state.status !== 'ready' || !['#overview-heading', '#hub-grammar', '#hub-pronunciation', '#hub-practice'].includes(location.hash)) return;
    const heading = document.getElementById(location.hash.slice(1));
    heading?.focus();
    heading?.scrollIntoView?.({ block: 'start' });
  }, [location.hash, location.key, state]);

  const updateFilters = (next: LanguageHubFilters) => {
    const nextQuery = buildLanguageHubSearch(next);
    setSearchParams(new URLSearchParams(nextQuery), { replace: false });
  };

  if (state.status === 'loading') {
    return <div className={styles.page}><Skeleton lines={7} label={t('hub.loading')} /></div>;
  }

  if (state.status === 'error') {
    return <HubErrorState cause={state.cause} onRetry={() => setRetryKey((value) => value + 1)} />;
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t('hub.breadcrumb')}>
        <Link to='/languages'>{t('hub.languages')}</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{state.language.nativeName}</span>
      </nav>

      <header className={styles.hubHeader}>
        <Link className={styles.backLink} to='/languages'><span aria-hidden='true'>←</span> {t('hub.back')}</Link>
        <div className={styles.identity}>
          <span className={styles.monogram} aria-hidden='true'>{state.language.code.slice(0, 2).toUpperCase()}</span>
          <div>
            <p className={styles.eyebrow}>LANGUAGE HUB</p>
            <h1>{state.language.nativeName}</h1>
            <p>{state.language.englishName} · {state.language.vietnameseName}</p>
          </div>
        </div>
        <p className={styles.identityMeta}>{t('hub.identity', { code: state.language.code.toUpperCase(), direction: t(state.language.direction === 'rtl' ? 'hub.rtl' : 'hub.ltr') })}</p>
      </header>

      <SectionNavigation language={state.language} filters={filters} hash={location.hash} />

      <LanguageFilters
        filters={filters}
        levelOptions={state.overview.filters.levelOptions}
        queryIssue={parsed.issue}
        onChange={updateFilters}
      />

      <div className={styles.filterUrl} role='status' aria-label={t('hub.filterUrl')}>{buildLanguageHubSearch(filters) || '?'} </div>

      <section className={styles.hubLayout} aria-live='polite'>
        <section className={styles.overviewPanel} aria-labelledby='overview-heading'>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>{t('hub.overview')}</p>
              <h2 id='overview-heading' tabIndex={-1}>{t('hub.overviewTitle', { language: state.language.nativeName })}</h2>
            </div>
          </div>
          <p className={styles.panelLead}>{t('hub.overviewLead')}</p>
          <p className={styles.panelLead}>{t('hub.availabilityDescription')}</p>
        </section>

        <aside className={styles.sideRail} aria-label={t('hub.infoLabel')}>
          <section className={styles.infoPanel}>
            <div className={styles.infoIcon} aria-hidden='true'><Icon name='info' size={20} /></div>
            <h2>{t('hub.availabilityTitle')}</h2>
            <p>{t('hub.availabilityDescription')}</p>
          </section>
          <section className={styles.levelPanel}>
            <p className={styles.eyebrow}>{t('hub.reference')}</p>
            <h2>{t('hub.cefrTitle')}</h2>
            <p>{t('hub.cefrDescription')}</p>
            <div className={styles.levelList}>{CEFR_LEVELS.map((level) => <span key={level}>{level}</span>)}</div>
          </section>
        </aside>
      </section>

      <LanguageHubCoreJourneys language={state.language} filters={filters} />

      <LanguageHubRemainingJourneys language={state.language} />

      <aside className={styles.bottomCallout} aria-label={t('hub.contributionLabel')}>
        <div><p className={styles.eyebrow}>{t('hub.together')}</p><h2>{t('hub.contributionTitle', { language: state.language.nativeName })}</h2></div>
        <Link className={styles.calloutLink} to='/library/contribute'>{t('hub.contributionLabel')} <span aria-hidden='true'>→</span></Link>
      </aside>
    </div>
  );
}

function SectionNavigation({ language, filters, hash }: { language: LanguageCatalogItem; filters: LanguageHubFilters; hash: string }) {
  const { t } = useUiLocale();
  const base = '/languages/' + language.slug + buildLanguageHubSearch(filters);
  const links = [
    { key: 'overview', href: base + '#overview-heading' },
    ...buildHubJourneys(language, filters),
    { key: 'grammar', href: base + '#hub-grammar' },
    { key: 'pronunciation', href: base + '#hub-pronunciation' },
    ...buildHubSocialJourneys(language),
    { key: 'practice', href: base + '#hub-practice' },
  ] as const;
  // All routes are audited product contracts; scaffolding metadata is not an authorization decision.
  return <nav className={styles.sectionNav} aria-label={t('hub.navigation')}>{links.map(({ key, href }) => {
    const active = href.endsWith(hash || '#overview-heading') && href.startsWith(base + '#');
    return <Link className={active ? styles.navItemActive : styles.navItem} key={key} to={href} onFocus={(event) => event.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' })} aria-current={active ? 'location' : undefined}>{t(`hub.${key}`)}</Link>;
  })}</nav>;
}

function LanguageFilters({ filters, levelOptions, queryIssue, onChange }: { filters: LanguageHubFilters; levelOptions: CefrLevel[]; queryIssue: 'invalid' | null; onChange: (filters: LanguageHubFilters) => void }) {
  const { t } = useUiLocale();
  const [topicDraft, setTopicDraft] = useState(filters.topic ?? '');
  const [topicIssue, setTopicIssue] = useState(false);

  useEffect(() => {
    setTopicDraft(filters.topic ?? '');
  }, [filters.topic]);

  const toggleLevel = (level: CefrLevel) => {
    const levels = filters.levels.length === 1 && filters.levels[0] === level ? [] : [level];
    onChange({ levels, topic: filters.topic });
  };

  const applyTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeLanguageHubTopic(topicDraft);
    if (topicDraft.trim() && !normalized) {
      setTopicIssue(true);
      return;
    }
    setTopicIssue(false);
    onChange({ levels: filters.levels, topic: normalized });
  };

  return (
    <section className={styles.filterBand} aria-labelledby='filter-heading'>
      <div className={styles.filterHeader}>
        <div><p className={styles.eyebrow}>{t('hub.filters')}</p><h2 id='filter-heading'>{t('hub.filterTitle')}</h2></div>
        <span>{t('hub.optional')}</span>
      </div>
      <p className={styles.filterHint}>{t('hub.filtersScope')}</p>
      {filters.levels.length > 1 ? <p className={styles.filterError} role='status'>{t('hub.legacyLevels')}</p> : null}
      <div className={styles.filterControls}>
        <div className={styles.levelControl} role='group' aria-label={t('hub.levelGroup')}>
          <span className={styles.controlLabel}>{t('hub.levelLabel')}</span>
          <div className={styles.levelButtons}>
            {levelOptions.map((level) => <button className={filters.levels.includes(level) ? styles.levelButtonActive : styles.levelButton} key={level} type='button' aria-pressed={filters.levels.includes(level)} onClick={() => toggleLevel(level)}>{level}</button>)}
          </div>
        </div>
        <form className={styles.topicControl} onSubmit={applyTopic}>
          <label className={styles.controlLabel} htmlFor='hub-topic'>{t('hub.topicLabel')}</label>
          <div className={styles.topicInputRow}>
            <input id='hub-topic' aria-invalid={topicIssue || queryIssue === 'invalid'} value={topicDraft} onChange={(event) => { setTopicDraft(event.target.value); setTopicIssue(false); }} placeholder={t('hub.topicPlaceholder')} />
            <Button type='submit' variant='secondary' size='sm'>{t('hub.apply')}</Button>
          </div>
          {topicIssue || queryIssue === 'invalid' ? <p className={styles.filterError} role='alert'>{t('hub.filterError')}</p> : <p className={styles.filterHint}>{t('hub.filterHint')}</p>}
        </form>
      </div>
    </section>
  );
}

function HubErrorState({ cause, onRetry }: { cause: unknown; onRetry: () => void }) {
  const { t } = useUiLocale();
  const code = getErrorCode(cause);
  if (code === 'LANGUAGE_NOT_FOUND' || code === 'LANGUAGE_INACTIVE' || code === 'LANGUAGE_INVALID_SLUG') {
    return <div className={styles.page}><section className={styles.notFound} role='alert'><span className={styles.notFoundIcon} aria-hidden='true'><Icon name='languages' size={24} /></span><h1>{t('hub.notFoundTitle')}</h1><p>{t('hub.notFoundDescription')}</p><Link className={styles.primaryLink} to='/languages'>{t('hub.back')}</Link></section></div>;
  }
  return <div className={styles.page}><ErrorState title={t('hub.errorTitle')} description={t('hub.errorDescription')} onRetry={onRetry} /></div>;
}

function getErrorCode(error: unknown): string | null {
  return error instanceof ApiClientError ? error.code : null;
}

type HubLoadState =
  | { status: 'loading' }
  | { status: 'error'; cause: unknown }
  | { status: 'ready'; language: LanguageCatalogItem; overview: LanguageHubOverview };
