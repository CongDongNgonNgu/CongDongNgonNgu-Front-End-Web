import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useAuth } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { communityApi } from '../api/community-api';
import { CommunityComposer, type CommunityComposerApiPort } from '../components/CommunityComposer';
import { CommunityPostCard, type CommunityPostActionsApi } from '../components/CommunityPostCard';
import { getCommunityFeedErrorMessage, useCommunityFeed, type CommunityFeedApiPort } from '../hooks/useCommunityFeed';
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
  onAuthRequired: () => void;
}

export function CommunityPage({ api = communityApi, catalogApi = languageApi }: CommunityPageProps) {
  const { status } = useAuth();
  const navigate = useNavigate();
  return (
    <CommunityPageView
      api={api}
      catalogApi={catalogApi}
      authenticated={status === 'authenticated'}
      onAuthRequired={() => navigate('/login', { state: { from: '/community' } })}
    />
  );
}

export function CommunityPageView({
  api = communityApi,
  catalogApi = languageApi,
  authenticated,
  onAuthRequired,
}: CommunityPageViewProps) {
  const { t, locale } = useUiLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const languageCode = searchParams.get('languageCode') ?? '';
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [languageError, setLanguageError] = useState<unknown>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const languageRequestId = useRef(0);
  const feed = useCommunityFeed({ api, authenticated, languageCode: languageCode || undefined });

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

  const handleLanguageChange = (nextLanguageCode: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextLanguageCode) nextParams.set('languageCode', nextLanguageCode);
    else nextParams.delete('languageCode');
    setSearchParams(nextParams, { replace: true });
  };

  const selectedLanguage = languages.find((language) => language.code === languageCode);

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

      <p><Link to='/community/groups'>{t('groups.title')}</Link></p>
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
                <h2 id='community-feed-heading'>{t("community.posts.newest")}</h2>
              </div>
              <div className={styles.filterField}>
                <label htmlFor='community-language-filter'>{t("community.posts.by.language")}</label>
                <select
                  id='community-language-filter'
                  value={languageCode}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                  disabled={isLoadingLanguages && languages.length === 0}
                >
                  <option value=''>{t("community.posts.all.languages")}</option>
                  {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.nativeName} · {language.englishName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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

            {!feed.isLoading && feed.error && feed.items.length === 0 ? (
              <ErrorState
                title={t("community.posts.unable.to.load.the.community.feed")}
                description={getCommunityFeedErrorMessage(feed.error, locale)}
                onRetry={() => void feed.refresh()}
              />
            ) : null}

            {!feed.isLoading && !feed.error && feed.items.length === 0 ? (
              <EmptyState
                title={selectedLanguage ? t("community.posts.no.posts.yet.in") + ' ' + selectedLanguage.nativeName : t("community.posts.no.posts.yet")}
                description={t("community.posts.come.back.later.or.be.the.first.to")}
                icon='message-circle'
              />
            ) : null}

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
                <Button variant='quiet' size='sm' onClick={() => void (feed.nextCursor ? feed.loadMore() : feed.refresh())}>{t("community.posts.try.again")}</Button>
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
          <div className={styles.railHeading}>
            <span className={styles.railIcon} aria-hidden='true'><Icon name='sparkles' size={18} /></span>
            <h2>{t("community.posts.an.open.community")}</h2>
          </div>
          <p>
            {t("community.posts.a.thoughtful.answer.can.help.someone.understand.a")}</p>
          <ul className={styles.guidelines}>
            <li>{t("community.posts.keep.your.content.clear.and.respectful")}</li>
            <li>{t("community.posts.choose.the.correct.target.language")}</li>
            <li>{t("community.posts.share.something.useful.with.other.learners")}</li>
          </ul>
          <Link className={styles.railLink} to='/languages'>{t("community.posts.explore.languages")}{' '}<span aria-hidden='true'>→</span></Link>
        </aside>
      </div>

      <CommunityComposer
        open={composerOpen}
        authenticated={authenticated}
        languages={languages}
        initialLanguageCode={languageCode}
        api={api}
        onClose={() => setComposerOpen(false)}
        onCreated={feed.prependPost}
        onAuthRequired={onAuthRequired}
      />
    </div>
  );
}
