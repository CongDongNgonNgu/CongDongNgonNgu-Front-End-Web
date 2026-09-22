import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { LibraryAttributionList } from '../components/LibraryAttributionList';
import { libraryApi } from '../library.api';
import type { LibraryPublicResource, LibraryResourceDetails, LibraryResourceType } from '../library.types';
import { useLibraryResource, type LibraryResourceApiPort } from '../hooks/useLibraryResource';
import styles from './LibraryResourceDetailPage.module.css';

interface LibraryResourceDetailPageProps {
  api?: LibraryResourceApiPort;
}

export function LibraryResourceDetailPage({ api = libraryApi }: LibraryResourceDetailPageProps) {
  const { resourceId } = useParams<{ resourceId: string }>();
  const state = useLibraryResource({ api, resourceId });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = state.resource ? `${getResourceTitle(state.resource)} | Thư viện mở` : 'Tài nguyên | Thư viện mở';
    return () => { document.title = previousTitle; };
  }, [state.resource]);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <Link to='/library'>Thư viện mở</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Chi tiết tài nguyên</span>
      </nav>

      {state.isLoading ? <div className={styles.loadingCard}><Skeleton lines={8} label='Đang tải tài nguyên' /></div> : null}
      {!state.isLoading && state.error ? (
        <ErrorState title='Tài nguyên không khả dụng' description='Tài nguyên này có thể đã bị ẩn hoặc không còn đủ điều kiện công khai.' onRetry={() => void state.refresh()} />
      ) : null}
      {!state.isLoading && !state.error && !state.resource ? (
        <EmptyState title='Không tìm thấy tài nguyên' description='Quay lại thư viện để tiếp tục khám phá.' icon='library' />
      ) : null}
      {!state.isLoading && state.resource ? <ResourceDetail resource={state.resource} /> : null}
    </div>
  );
}

function ResourceDetail({ resource }: { resource: LibraryPublicResource }) {
  const title = getResourceTitle(resource);
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Link className={styles.backLink} to='/library'><span aria-hidden='true'>←</span> Quay lại thư viện</Link>
          <div className={styles.typeLine}>
            <span className={styles.typeIcon} aria-hidden='true'><Icon name='book-open' size={18} /></span>
            <span>{getResourceTypeLabel(resource.resourceType)}</span>
            <span className={styles.verified}><Icon name='check-circle' size={16} /> Đã xác minh</span>
          </div>
          <h1>{title}</h1>
          <p className={styles.lede}>{getResourceLede(resource.details)}</p>
        </div>
        <aside className={styles.metaRail} aria-label='Thông tin tài nguyên'>
          <span className={styles.metaLabel}>PUBLIC RESOURCE</span>
          <span className={styles.metaValue}>{resource.primaryLanguageCode.toUpperCase()}{resource.secondaryLanguageCode ? ` · ${resource.secondaryLanguageCode.toUpperCase()}` : ''}</span>
          {resource.cefrLevel ? <span className={styles.metaValue}>CEFR {resource.cefrLevel}</span> : null}
          <div className={styles.topicList}>{resource.topics.map((topic) => <span key={topic}>#{topic}</span>)}</div>
        </aside>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.content} aria-labelledby='resource-content-heading'>
          <p className={styles.eyebrow}>LEARNING CONTENT</p>
          <h2 id='resource-content-heading'>Nội dung tài nguyên</h2>
          <DetailsContent details={resource.details} />
        </section>
        <aside className={styles.notes} aria-label='Ghi chú sử dụng'>
          <div className={styles.noteMark}>02</div>
          <h2>Đọc, học, ghi công.</h2>
          <p>Nội dung công khai được giữ ở dạng đọc-only. Hãy xem điều khoản giấy phép trước khi tái sử dụng hoặc chia sẻ lại.</p>
        </aside>
      </div>

      <LibraryAttributionList entries={resource.provenance} detail />
    </article>
  );
}

function DetailsContent({ details }: { details: LibraryResourceDetails }) {
  switch (details.resourceType) {
    case 'VOCABULARY':
      return <div className={styles.detailStack}><div className={styles.term}>{details.term}</div><p>{details.definition}</p>{details.partOfSpeech ? <p className={styles.secondary}>{details.partOfSpeech}</p> : null}{details.exampleSentence ? <blockquote>{details.exampleSentence}</blockquote> : null}</div>;
    case 'SENTENCE':
      return <div className={styles.detailStack}><p className={styles.quoteText}>{details.text}</p>{details.context ? <p className={styles.secondary}>{details.context}</p> : null}</div>;
    case 'TRANSLATION':
      return <div className={styles.translation}><div><span>Source</span><p>{details.sourceText}</p></div><div><span>Translation</span><p>{details.translatedText}</p></div></div>;
    case 'GRAMMAR_ITEM':
      return <div className={styles.detailStack}><p>{details.explanation}</p>{details.pattern ? <pre>{details.pattern}</pre> : null}{details.exampleText ? <blockquote>{details.exampleText}</blockquote> : null}</div>;
    case 'DIALOGUE':
      return <div className={styles.dialogue}>{details.turns.map((turn, index) => <div className={styles.turn} key={`${turn.speaker}-${index}`}><span>{turn.speaker}</span><div><p>{turn.text}</p>{turn.translation ? <p className={styles.secondary}>{turn.translation}</p> : null}</div></div>)}</div>;
    case 'IDIOM':
      return <div className={styles.detailStack}><div className={styles.term}>{details.expression}</div><p>{details.meaning}</p>{details.usageNote ? <blockquote>{details.usageNote}</blockquote> : null}</div>;
    case 'SLANG':
      return <div className={styles.detailStack}><div className={styles.term}>{details.expression}</div><p>{details.meaning}</p>{details.register ? <p className={styles.secondary}>{details.register}</p> : null}{details.usageNote ? <blockquote>{details.usageNote}</blockquote> : null}</div>;
    case 'CULTURAL_NOTE':
      return <div className={styles.detailStack}><p>{details.body}</p></div>;
    case 'PRONUNCIATION':
      return <div className={styles.detailStack}><div className={styles.term}>{details.term}</div><p className={styles.phonetic}>{details.phonetic}</p>{details.notes ? <p>{details.notes}</p> : null}</div>;
    case 'LEARNING_COLLECTION':
      return <div className={styles.detailStack}><p>{details.description}</p></div>;
  }
}

function getResourceTitle(resource: LibraryPublicResource): string {
  return getDetailsTitle(resource.details);
}

function getDetailsTitle(details: LibraryResourceDetails): string {
  switch (details.resourceType) {
    case 'VOCABULARY': return details.term;
    case 'SENTENCE': return details.text;
    case 'TRANSLATION': return details.sourceText;
    case 'GRAMMAR_ITEM': return details.title;
    case 'DIALOGUE': return details.title;
    case 'IDIOM': return details.expression;
    case 'SLANG': return details.expression;
    case 'CULTURAL_NOTE': return details.title;
    case 'PRONUNCIATION': return details.term;
    case 'LEARNING_COLLECTION': return details.title;
  }
}

function getResourceLede(details: LibraryResourceDetails): string {
  switch (details.resourceType) {
    case 'VOCABULARY': return details.definition;
    case 'SENTENCE': return details.context ?? 'Một câu mẫu trong thư viện mở.';
    case 'TRANSLATION': return details.translatedText;
    case 'GRAMMAR_ITEM': return details.explanation;
    case 'DIALOGUE': return details.turns[0]?.text ?? 'Một đoạn hội thoại.';
    case 'IDIOM': return details.meaning;
    case 'SLANG': return details.meaning;
    case 'CULTURAL_NOTE': return details.body;
    case 'PRONUNCIATION': return details.phonetic;
    case 'LEARNING_COLLECTION': return details.description;
  }
}

function getResourceTypeLabel(type: LibraryResourceType): string {
  const labels: Record<LibraryResourceType, string> = {
    VOCABULARY: 'Từ vựng', SENTENCE: 'Câu mẫu', TRANSLATION: 'Bản dịch', GRAMMAR_ITEM: 'Ngữ pháp', DIALOGUE: 'Hội thoại', IDIOM: 'Thành ngữ', SLANG: 'Tiếng lóng', CULTURAL_NOTE: 'Văn hoá', PRONUNCIATION: 'Phát âm', LEARNING_COLLECTION: 'Bộ sưu tập',
  };
  return labels[type];
}
