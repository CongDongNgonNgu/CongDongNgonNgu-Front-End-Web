import { CommunitySocialNavigation } from '../components/CommunitySocialNavigation';
import { CommunityLanguageDiscoveryCard } from '../components/CommunityLanguageDiscoveryCard';
import { CommunitySearchForm } from '../components/CommunitySearchForm';
import { parseCommunitySearch, serializeCommunitySearch, type CommunitySearchQuery } from '../community-search';
import { COMMUNITY_POST_TYPE_LABELS_KEYS } from '../community.constants';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useAuth } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { communityApi } from '../api/community-api';
import { CommunityComposer, type CommunityComposerApiPort } from '../components/CommunityComposer';
import { CommunityPostCard, type CommunityPostActionsApi } from '../components/CommunityPostCard';
import { getCommunityFeedErrorMessage, isCommunityCursorError, useCommunityFeed, type CommunityFeedApiPort } from '../hooks/useCommunityFeed';
import styles from './CommunityPage.module.css';

export interface CommunityPageApi extends CommunityFeedApiPort, CommunityComposerApiPort, CommunityPostActionsApi {}

interface CommunityPageProps {
  api?: CommunityPageApi;
  catalogApi?: {
    listLanguages: (search?: string) => Promise<LanguageCatalogItem[]>;
  };
}

interface CommunityPageViewProps extends CommunityPageProps {
  authenticated: boolean;
  actorId?: string;
  onAuthRequired: () => void;
}

export function CommunityPage({ api = communityApi, catalogApi = languageApi }: CommunityPageProps) {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <CommunityPageView
      api={api}
      catalogApi={catalogApi}
      authenticated={status === 'authenticated'}
      actorId={user?.id}
      onAuthRequired={() => navigate('/login', { state: { from: location.pathname + location.search } })}
    />
  );
}

export function CommunityPageView({
  api = communityApi,
  catalogApi = languageApi,
  authenticated,
  actorId,
  onAuthRequired,
}: CommunityPageViewProps) {
  const { t, locale } = useUiLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = useMemo(() => parseCommunitySearch(searchParams), [searchParams]);
  const query = parsed.query;
  const languageCode = query.languageCode ?? '';
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [languageError, setLanguageError] = useState<unknown>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const languageRequestId = useRef(0);
  const unknownLanguage = Boolean(languageCode) && !isLoadingLanguages && !languageError && !languages.some((language) => language.code === languageCode && language.active);
  const invalidFilters = parsed.invalid || unknownLanguage;
  const signInRequired = query.savedByMe && !authenticated;
  const feed = useCommunityFeed({ api, authenticated, actorId, query, enabled: !invalidFilters && (!languageCode || (!isLoadingLanguages && !languageError)) });

  const loadLanguages = useCallback(async () => {
    const requestId = ++languageRequestId.current;
    setIsLoadingLanguages(true);
    setLanguageError(null);
    try {
      const result = await catalogApi.listLanguages();
      if (requestId !== languageRequestId.current) return;
      setLanguages(result);
    } catch (error) {
      if (requestId !== languageRequestId.current) return;
      setLanguageError(error);
    } finally {
      if (requestId === languageRequestId.current) setIsLoadingLanguages(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    void loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name=description]');
    const previousDescription = meta?.getAttribute('content');
    document.title = t("community.posts.language.learning.community.congdongngonngu.vn");
    meta?.setAttribute('content', t("community.posts.discuss.ask.questions.and.share.language.learning.moments"));
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
    };
  }, [t]);

  const handleOpenComposer = () => {
    if (!authenticated) {
      onAuthRequired();
      return;
    }
    setComposerOpen(true);
  };

  const handleApply = (nextQuery: CommunitySearchQuery) => {
    const params = serializeCommunitySearch(nextQuery);
    if (params.toString() === searchParams.toString()) void feed.refresh();
    else setSearchParams(params);
  };
  const handleReset = () => {
    if (!searchParams.toString()) void feed.refresh();
    else setSearchParams(new URLSearchParams());
  };

  const selectedLanguage = languages.find((language) => language.code === languageCode);
  const summaries = [
    query.q ? t('community.search.label') + ': “' + query.q + '”' : null,
    languageCode ? t('community.posts.by.language') + ': ' + (selectedLanguage?.nativeName ?? t('community.search.invalidLanguage')) : null,
    query.postType ? t(COMMUNITY_POST_TYPE_LABELS_KEYS[query.postType]) : null,
    query.topic ? t('community.search.topic') + ': ' + query.topic : null,
    query.responseState ? t(query.responseState === 'UNANSWERED' ? 'community.search.unanswered' : query.responseState === 'ANSWERED' ? 'community.search.answered' : 'community.search.accepted') : null,
    query.savedByMe ? t('community.search.saved') : null,
    query.sort === 'USEFUL' ? t('community.search.useful') : null,
  ].filter(Boolean);
  const filtered = summaries.length > 0;
  const showResults = !invalidFilters && !signInRequired;


  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t("community.posts.breadcrumb")}>
        <Link to='/'>{t("community.posts.home")}</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{t("community.posts.community")}</span>
      </nav>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>{t("community.posts.language.learning.community")}</p>
        <h1>{t("community.posts.learn.together.share.your.voice")}</h1>
        <p className={styles.heroDescription}>
          {t("community.posts.a.place.for.learners.and.native.speakers.to")}</p>
      </header>

      {authenticated ? <CommunitySocialNavigation/> : null}
      <div className={styles.contentGrid}>
        <section className={styles.feedColumn} aria-labelledby='community-feed-heading'>
          <section className={styles.composerPrompt} aria-label={t("community.posts.create.a.post")}>
            <div className={styles.promptIcon} aria-hidden='true'><Icon name='users' size={24} /></div>
            <div className={styles.promptCopy}>
              <strong>{authenticated ? t("community.posts.what.are.you.learning") : t("community.posts.want.to.share.with.the.community")}</strong>
              <p>{authenticated ? t("community.posts.ask.a.question.or.write.about.a.new") : t("community.posts.sign.in.to.create.your.own.post")}</p>
            </div>
            <div className={styles.promptActions}>
              <Button onClick={handleOpenComposer}>
                {authenticated ? t("community.posts.create.a.post") : t("community.posts.sign.in.to.write")}
              </Button>
              <Link className={styles.promptActionLink} to='/community/ask/correction'>
                {t("community.posts.ask.the.community.for.corrections")}</Link>
              <Link className={styles.promptActionLink} to='/community/ask/question'>
                {t("community.posts.ask.a.question")}</Link>
            </div>
          </section>

          <section className={styles.feedSection}>
            <div className={styles.feedHeading}>
              <div>
                <p className={styles.eyebrow}>{t("community.posts.community.alternative")}</p>
                <h2 id='community-feed-heading'>{t(filtered ? 'community.search.results' : 'community.posts.newest')}</h2>
              </div>

            </div>

            <CommunitySearchForm key={searchParams.toString()} query={query} languages={languages} languagesLoading={isLoadingLanguages} authenticated={authenticated} onApply={handleApply} onReset={handleReset} onAuthRequired={onAuthRequired}/>
            {invalidFilters ? <p className={styles.inlineNotice} role='alert'>{t('community.search.invalidUrl')}</p> : null}
            {signInRequired ? <div className={styles.inlineNotice} role='status'><Button variant='secondary' onClick={onAuthRequired}>{t('community.search.signIn')}</Button></div> : null}
            {showResults ? <p className={styles.searchSummary} role='status'>{filtered ? t('community.search.applied', { filters: summaries.join(' · ') }) : t('community.search.none')}</p> : null}
            {showResults && query.sort === 'USEFUL' ? <p className={styles.searchSummary}>{t('community.search.rankHint')}</p> : null}
            {showResults ? <Button variant='quiet' onClick={() => void feed.refresh()} disabled={feed.isLoading}>{t('community.search.refresh')}</Button> : null}

            {languageError ? (
              <div className={styles.inlineNotice} role='alert'>
                <span>{t("community.posts.unable.to.load.languages.the.filter.will.be")}</span>
                <Button variant='quiet' size='sm' onClick={() => void loadLanguages()}>{t("community.posts.try.again")}</Button>
              </div>
            ) : null}

            {feed.isLoading ? (
              <div className={styles.loadingCard}>
                <Skeleton lines={5} label={t("community.posts.loading.the.community.feed")} />
              </div>
            ) : null}

            {showResults && !feed.isLoading && feed.error && feed.items.length === 0 ? (
              <ErrorState
                title={t("community.posts.unable.to.load.the.community.feed")}
                description={getCommunityFeedErrorMessage(feed.error, locale)}
                onRetry={() => void feed.refresh()}
              />
            ) : null}

            {showResults && !feed.isLoading && !feed.error && feed.items.length === 0 ? (
              <div>
              <EmptyState
                title={filtered ? t('community.search.noMatches') : t('community.posts.no.posts.yet')}
                description={t(filtered ? 'community.search.emptyHelp' : 'community.posts.come.back.later.or.be.the.first.to')}
                icon='message-circle'
              />
              {filtered ? <Button variant='secondary' onClick={handleReset}>{t('community.discovery.clear')}</Button> : null}
              </div>
            ) : null}

            {showResults && !feed.isLoading && !feed.error ? <p className={styles.searchSummary}>{t('community.search.shown', { count: feed.items.length })}</p> : null}
            <div className={styles.postList} aria-live='polite'>
              {feed.items.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  api={api}
                  authenticated={authenticated}
                  onAuthRequired={onAuthRequired}
                />
              ))}
            </div>

            {feed.error && feed.items.length > 0 ? (
              <div className={styles.inlineNotice} role='alert'>
                <span>{getCommunityFeedErrorMessage(feed.error, locale)}</span>
                <Button variant='quiet' size='sm' onClick={() => void (feed.nextCursor ? feed.loadMore() : feed.refresh())}>{t(isCommunityCursorError(feed.error) ? 'community.search.refresh' : 'community.posts.try.again')}</Button>
              </div>
            ) : null}

            {feed.nextCursor ? (
              <Button
                variant='secondary'
                className={styles.loadMore}
                onClick={() => void feed.loadMore()}
                loading={feed.isLoadingMore}
              >
                {t("community.posts.load.more")}</Button>
            ) : null}
          </section>
        </section>

        <aside className={styles.rail} aria-label={t("community.posts.about.the.community")}>
          <CommunityLanguageDiscoveryCard/>
          <section className={styles.guidelineCard}>
            <h2>{t('community.detail.discussion.guidelines')}</h2>
            <ul className={styles.guidelines}>
              <li>{t("community.posts.keep.your.content.clear.and.respectful")}</li>
              <li>{t("community.posts.choose.the.correct.target.language")}</li>
              <li>{t("community.posts.share.something.useful.with.other.learners")}</li>
            </ul>
          </section>
        </aside>
      </div>

      <CommunityComposer
        open={composerOpen}
        authenticated={authenticated}
        languages={languages}
        initialLanguageCode={languageCode}
        api={api}
        onClose={() => setComposerOpen(false)}
        onCreated={() => void feed.refresh()}
        onAuthRequired={onAuthRequired}
      />
    </div>
  );
}
