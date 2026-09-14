import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [languageCode, setLanguageCode] = useState('');
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
    document.title = 'Cộng đồng học ngôn ngữ | CongDongNgonNgu.vn';
    meta?.setAttribute('content', 'Trao đổi, đặt câu hỏi và chia sẻ khoảnh khắc học ngôn ngữ cùng cộng đồng.');
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
    };
  }, []);

  const handleOpenComposer = () => {
    if (!authenticated) {
      onAuthRequired();
      return;
    }
    setComposerOpen(true);
  };

  const selectedLanguage = languages.find((language) => language.code === languageCode);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Cộng đồng</span>
      </nav>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>CỘNG ĐỒNG HỌC NGÔN NGỮ</p>
        <h1>Cùng học, cùng góp tiếng nói.</h1>
        <p className={styles.heroDescription}>
          Nơi người học và người bản ngữ trao đổi câu hỏi, chia sẻ tài nguyên và giúp nhau tiến bộ từng bước.
        </p>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.feedColumn} aria-labelledby='community-feed-heading'>
          <section className={styles.composerPrompt} aria-label='Tạo bài viết'>
            <div className={styles.promptIcon} aria-hidden='true'><Icon name='users' size={24} /></div>
            <div className={styles.promptCopy}>
              <strong>{authenticated ? 'Bạn đang học điều gì?' : 'Muốn chia sẻ cùng cộng đồng?'}</strong>
              <p>{authenticated ? 'Đặt một câu hỏi hoặc ghi lại một khám phá mới.' : 'Đăng nhập để tạo bài viết của riêng bạn.'}</p>
            </div>
            <Button onClick={handleOpenComposer}>
              {authenticated ? 'Tạo bài viết' : 'Đăng nhập để viết'}
            </Button>
          </section>

          <section className={styles.feedSection}>
            <div className={styles.feedHeading}>
              <div>
                <p className={styles.eyebrow}>COMMUNITY</p>
                <h2 id='community-feed-heading'>Mới nhất</h2>
              </div>
              <div className={styles.filterField}>
                <label htmlFor='community-language-filter'>Theo ngôn ngữ</label>
                <select
                  id='community-language-filter'
                  value={languageCode}
                  onChange={(event) => setLanguageCode(event.target.value)}
                  disabled={isLoadingLanguages && languages.length === 0}
                >
                  <option value=''>Tất cả ngôn ngữ</option>
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
                <span>Không thể tải danh mục ngôn ngữ. Bộ lọc sẽ hoạt động lại khi tải thành công.</span>
                <Button variant='quiet' size='sm' onClick={() => void loadLanguages()}>Thử lại</Button>
              </div>
            ) : null}

            {feed.isLoading ? (
              <div className={styles.loadingCard}>
                <Skeleton lines={5} label='Đang tải bảng tin cộng đồng' />
              </div>
            ) : null}

            {!feed.isLoading && feed.error && feed.items.length === 0 ? (
              <ErrorState
                title='Không thể tải bảng tin cộng đồng'
                description={getCommunityFeedErrorMessage(feed.error)}
                onRetry={() => void feed.refresh()}
              />
            ) : null}

            {!feed.isLoading && !feed.error && feed.items.length === 0 ? (
              <EmptyState
                title={selectedLanguage ? 'Chưa có bài viết bằng ' + selectedLanguage.nativeName : 'Chưa có bài viết nào'}
                description='Hãy quay lại sau hoặc là người đầu tiên chia sẻ một câu hỏi trong không gian này.'
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
                <span>{getCommunityFeedErrorMessage(feed.error)}</span>
                <Button variant='quiet' size='sm' onClick={() => void (feed.nextCursor ? feed.loadMore() : feed.refresh())}>Thử lại</Button>
              </div>
            ) : null}

            {feed.nextCursor ? (
              <Button
                variant='secondary'
                className={styles.loadMore}
                onClick={() => void feed.loadMore()}
                loading={feed.isLoadingMore}
              >
                Xem thêm
              </Button>
            ) : null}
          </section>
        </section>

        <aside className={styles.rail} aria-label='Về cộng đồng'>
          <div className={styles.railHeading}>
            <span className={styles.railIcon} aria-hidden='true'><Icon name='sparkles' size={18} /></span>
            <h2>Cộng đồng mở</h2>
          </div>
          <p>
            Một câu trả lời tử tế có thể giúp ai đó hiểu thêm một ngôn ngữ. Hãy bắt đầu từ điều bạn đang tò mò.
          </p>
          <ul className={styles.guidelines}>
            <li>Giữ nội dung rõ ràng và tôn trọng.</li>
            <li>Chọn đúng ngôn ngữ mục tiêu.</li>
            <li>Chia sẻ điều hữu ích cho người học khác.</li>
          </ul>
          <Link className={styles.railLink} to='/languages'>Khám phá danh mục ngôn ngữ <span aria-hidden='true'>→</span></Link>
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
