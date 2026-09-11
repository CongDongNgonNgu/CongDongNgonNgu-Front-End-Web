import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { languageApi } from '../api/language-api';
import type { LanguageCatalogItem } from '../languages.types';
import styles from './LanguageExplorerPage.module.css';

export interface LanguageExplorerApi {
  listLanguages: (search?: string) => Promise<LanguageCatalogItem[]>;
}

interface LanguageExplorerPageProps {
  api?: LanguageExplorerApi;
}

export function LanguageExplorerPage({ api = languageApi }: LanguageExplorerPageProps) {
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [languages, setLanguages] = useState<LanguageCatalogItem[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestId = useRef(0);

  const loadLanguages = useCallback(async (search: string) => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.listLanguages(search);
      if (currentRequest !== requestId.current) return;
      setLanguages(result);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setLanguages(null);
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadLanguages(submittedSearch);
  }, [loadLanguages, submittedSearch]);

  usePageMetadata();

  const handleSubmit = () => setSubmittedSearch(searchInput.trim());

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Ngôn ngữ</span>
      </nav>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>KHÔNG GIAN NGÔN NGỮ</p>
        <h1>Khám phá ngôn ngữ</h1>
        <p className={styles.heroDescription}>
          Tìm một ngôn ngữ để bắt đầu hành trình học tập, đóng góp và kết nối cùng cộng đồng.
        </p>
      </header>

      <form className={styles.searchBar} role='search' onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
        <Icon name='search' size={20} className={styles.searchIcon} />
        <label htmlFor='language-search'>Tìm ngôn ngữ</label>
        <input
          id='language-search'
          type='search'
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder='Tên tiếng Việt, English, tên bản ngữ hoặc mã ngôn ngữ'
        />
        <Button type='submit' size='md'>Tìm</Button>
      </form>

      <section className={styles.content} aria-live='polite'>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>DANH MỤC HIỆN CÓ</p>
            <h2>Chọn ngôn ngữ của bạn</h2>
          </div>
          {languages ? <span className={styles.resultCount}>{languages.length} ngôn ngữ</span> : null}
        </div>

        {isLoading && languages === null ? <div className={styles.loading}><Skeleton lines={5} label='Đang tải danh sách ngôn ngữ' /></div> : null}
        {error ? <ErrorState title='Không thể tải danh sách ngôn ngữ' description={getExplorerErrorMessage(error)} onRetry={() => void loadLanguages(submittedSearch)} /> : null}
        {!error && !isLoading && languages && languages.length === 0 ? (
          <EmptyState
            title='Chưa tìm thấy ngôn ngữ phù hợp'
            description='Thử một tên khác hoặc xoá bộ lọc tìm kiếm để xem lại toàn bộ danh mục.'
            icon='languages'
          />
        ) : null}
        {!error && languages && languages.length > 0 ? (
          <div className={styles.catalogGrid}>
            {languages.map((language) => <LanguageCard key={language.slug} language={language} />)}
          </div>
        ) : null}

        <aside className={styles.communityCallout} aria-label='Đóng góp ngôn ngữ'>
          <div className={styles.calloutIcon} aria-hidden='true'><Icon name='globe' size={24} /></div>
          <div>
            <p className={styles.eyebrow}>CỘNG ĐỒNG MỞ</p>
            <h2>Ngôn ngữ phát triển cùng người học</h2>
            <p>Danh mục được mở rộng từ dữ liệu ngôn ngữ và đóng góp thực tế của cộng đồng.</p>
          </div>
          <Link className={styles.textLink} to='/register'>Tham gia cộng đồng <span aria-hidden='true'>→</span></Link>
        </aside>
      </section>
    </div>
  );
}

function LanguageCard({ language }: { language: LanguageCatalogItem }) {
  const monogram = language.code.slice(0, 2).toUpperCase();
  const statusLabel = language.active ? (language.launch ? 'Đang mở' : 'Đang chuẩn bị') : 'Tạm ẩn';
  return (
    <Link className={styles.languageCard} to={`/languages/${language.slug}`}>
      <span className={styles.monogram} aria-hidden='true'>{monogram}</span>
      <span className={styles.languageCopy}>
        <span className={styles.languageNative}>{language.nativeName}</span>
        <span className={styles.languageNames}>{language.englishName} · {language.vietnameseName}</span>
        <span className={styles.languageMeta}>Mã {language.code.toUpperCase()} · {language.direction === 'rtl' ? 'viết từ phải sang trái' : 'viết từ trái sang phải'}</span>
      </span>
      <span className={styles.languageAction}>
        <span className={styles.status}>{statusLabel}</span>
        <span aria-hidden='true'>Xem hub&nbsp;→</span>
      </span>
    </Link>
  );
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
    canonical.setAttribute('href', new URL('/languages', window.location.origin).toString());
    document.title = 'Khám phá ngôn ngữ | CongDongNgonNgu.vn';
    meta?.setAttribute('content', 'Khám phá các ngôn ngữ đang được mở trên CongDongNgonNgu.vn.');
    return () => {
      document.title = previousTitle;
      if (meta && typeof previousDescription === 'string') meta.setAttribute('content', previousDescription);
      if (createdCanonical) canonical.remove();
      else if (previousCanonical !== null) canonical.setAttribute('href', previousCanonical);
    };
  }, []);
}
function getExplorerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return 'Dữ liệu danh mục chưa sẵn sàng. Bạn có thể thử lại sau ít phút.';
  return 'Dữ liệu danh mục chưa sẵn sàng. Bạn có thể thử lại sau ít phút.';
}
