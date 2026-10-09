import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { ApiClientError } from '../../../services/api-client';
import { languageApi } from '../api/language-api';
import { LanguageFutureEntrypoints } from '../components/LanguageFutureEntrypoints';
import { LanguageHubCoreJourneys } from '../components/LanguageHubCoreJourneys';
import { buildHubJourneys } from '../domain/hub-journeys';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { buildLanguageHubSearch, normalizeLanguageHubTopic, parseLanguageHubSearch } from '../domain/language-filters';
import { CEFR_LEVELS, type CefrLevel, type HubSectionAvailability, type LanguageCatalogItem, type LanguageHubFilters, type LanguageHubOverview } from '../languages.types';
import styles from './LanguageHubPage.module.css';

export interface LanguageHubApi {
  getLanguage: (slug: string) => Promise<LanguageCatalogItem>;
  getOverview: (slug: string, filters: LanguageHubFilters) => Promise<LanguageHubOverview>;
}

interface LanguageHubPageProps {
  api?: LanguageHubApi;
}

const sectionLabels: Record<HubSectionAvailability['key'], string> = {
  overview: 'Tổng quan',
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  sentences: 'Mẫu câu',
  pronunciation: 'Phát âm',
  resources: 'Tài nguyên',
  community: 'Cộng đồng',
  questions: 'Hỏi đáp',
  practice: 'Luyện tập',
  exchange: 'Trao đổi',
};

export function LanguageHubPage({ api = languageApi }: LanguageHubPageProps) {
  const { t } = useUiLocale();
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
    document.title = state.overview.seo.title;
    meta?.setAttribute('content', state.overview.seo.description);
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
      if (createdCanonical) canonical.remove();
      else if (previousCanonical !== null) canonical.setAttribute('href', previousCanonical);
    };
  }, [state]);

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
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/languages'>Ngôn ngữ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{state.language.nativeName}</span>
      </nav>

      <header className={styles.hubHeader}>
        <Link className={styles.backLink} to='/languages'><span aria-hidden='true'>←</span> Quay lại khám phá</Link>
        <div className={styles.identity}>
          <span className={styles.monogram} aria-hidden='true'>{state.language.code.slice(0, 2).toUpperCase()}</span>
          <div>
            <p className={styles.eyebrow}>LANGUAGE HUB</p>
            <h1>{state.language.nativeName}</h1>
            <p>{state.language.englishName} · {state.language.vietnameseName}</p>
          </div>
        </div>
        <p className={styles.identityMeta}>Mã {state.language.code.toUpperCase()} · {state.language.direction === 'rtl' ? 'viết từ phải sang trái' : 'viết từ trái sang phải'}</p>
      </header>

      <SectionNavigation slug={state.language.slug} sections={state.overview.sections} coreJourneys={buildHubJourneys(state.language, filters)} />

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
              <p className={styles.eyebrow}>OVERVIEW</p>
              <h2 id='overview-heading'>Tổng quan {state.language.nativeName}</h2>
            </div>
            <span className={styles.availableBadge}>Đang mở</span>
          </div>
          <p className={styles.panelLead}>Không gian nền tảng cho nội dung học tập và đóng góp cộng đồng của {state.language.englishName}.</p>
          <HubMetrics overview={state.overview} />
          <EmptyState
            title='Nội dung tổng quan đang được chuẩn bị'
            description='Các tài nguyên học tập sẽ được mở dần theo dữ liệu và đóng góp thực tế của cộng đồng.'
            icon='book-open'
          />
        </section>

        <aside className={styles.sideRail} aria-label='Thông tin hub'>
          <section className={styles.infoPanel}>
            <div className={styles.infoIcon} aria-hidden='true'><Icon name='info' size={20} /></div>
            <h2>Đây là không gian mở</h2>
            <p>Chỉ những phần đã có dữ liệu mới được bật. Các mục còn lại sẽ xuất hiện khi sẵn sàng.</p>
          </section>
          <section className={styles.levelPanel}>
            <p className={styles.eyebrow}>KHUNG THAM CHIẾU</p>
            <h2>Trình độ CEFR</h2>
            <p>A1 đến C2 là các mức có thể dùng để lọc nội dung khi dữ liệu được mở.</p>
            <div className={styles.levelList}>{CEFR_LEVELS.map((level) => <span key={level}>{level}</span>)}</div>
          </section>
        </aside>
      </section>

      <LanguageHubCoreJourneys language={state.language} filters={filters} />

      <LanguageFutureEntrypoints
        languageName={state.language.nativeName}
        sections={state.overview.sections}
      />

      <aside className={styles.bottomCallout} aria-label='Đóng góp cho ngôn ngữ'>
        <div><p className={styles.eyebrow}>CÙNG XÂY DỰNG</p><h2>Bạn muốn đóng góp cho {state.language.nativeName}?</h2></div>
        <Link className={styles.calloutLink} to='/register'>Tham gia cộng đồng <span aria-hidden='true'>→</span></Link>
      </aside>
    </div>
  );
}

function SectionNavigation({ slug, sections, coreJourneys }: { slug: string; sections: HubSectionAvailability[]; coreJourneys: ReturnType<typeof buildHubJourneys> }) {
  const { t } = useUiLocale();
  return (
    <nav className={styles.sectionNav} aria-label='Các phần của language hub'>
      {sections.map((section) => {
        const core = coreJourneys.find((item) => item.key === section.key);
        if (core) return <Link className={styles.navItem} key={core.key} to={core.href}>{t(`hub.${core.key}`)}</Link>;
        return section.isNavigable && section.href ? (
        <Link className={section.key === 'overview' ? styles.navItemActive : styles.navItem} key={section.key} to={section.href.replace(':slug', slug)}>{sectionLabels[section.key]}</Link>
      ) : (
        <button className={styles.navItem} key={section.key} type='button' disabled>{sectionLabels[section.key]}<span className={styles.notReady}>Sắp có</span></button>
      ); })}
    </nav>
  );
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

function HubMetrics({ overview }: { overview: LanguageHubOverview }) {
  const metrics = [
    ['Người học', overview.metrics.learnerCount],
    ['Người đóng góp', overview.metrics.contributorCount],
    ['Tài nguyên', overview.metrics.resourceCount],
  ] as const;
  return <dl className={styles.metrics}>{metrics.map(([label, metric]) => <div key={label}><dt>{label}</dt><dd>{metric.state === 'AVAILABLE' && metric.value !== null ? metric.value.toLocaleString('vi-VN') : 'Chưa khả dụng'}</dd></div>)}</dl>;
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
