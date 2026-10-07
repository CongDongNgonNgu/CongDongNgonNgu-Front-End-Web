import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { LibraryAttributionList } from '../components/LibraryAttributionList';
import { LibraryLearnFromResourcePanel } from '../components/LibraryLearnFromResourcePanel';
import { libraryApi } from '../library.api';
import type { LibraryPublicResource, LibraryResourceDetails } from '../library.types';
import { useLibraryResource, type LibraryResourceApiPort } from '../hooks/useLibraryResource';
import { resourceTypeLabelKeys, contentLanguage } from '../library.presentation';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import styles from './LibraryResourceDetailPage.module.css';

interface LibraryResourceDetailPageProps {
  api?: LibraryResourceApiPort;
}

export function LibraryResourceDetailPage({ api = libraryApi }: LibraryResourceDetailPageProps) {
  const { t } = useUiLocale();
  const { resourceId } = useParams<{ resourceId: string }>();
  const state = useLibraryResource({ api, resourceId });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = state.resource ? `${getResourceTitle(state.resource)} | ${t('library.name')}` : t('library.resourceDocumentTitle');
    return () => { document.title = previousTitle; };
  }, [state.resource, t]);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t('library.breadcrumb')}>
        <Link to='/'>{t('library.home')}</Link>
        <span aria-hidden='true'>/</span>
        <Link to='/library'>{t('library.name')}</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{t('library.detailTitle')}</span>
      </nav>

      {state.isLoading ? <div className={styles.loadingCard}><Skeleton lines={8} label={t('library.detailLoading')} /></div> : null}
      {!state.isLoading && state.error ? (
        <ErrorState title={t('library.detailError')} description={t('library.detailErrorDescription')} onRetry={() => void state.refresh()} />
      ) : null}
      {!state.isLoading && !state.error && !state.resource ? (
        <EmptyState title={t('library.notFound')} description={t('library.notFoundDescription')} icon='library' />
      ) : null}
      {!state.isLoading && state.resource ? <ResourceDetail resource={state.resource} /> : null}
    </div>
  );
}

function ResourceDetail({ resource }: { resource: LibraryPublicResource }) {
  const { t } = useUiLocale();
  const title = getResourceTitle(resource);
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Link className={styles.backLink} to='/library'><span aria-hidden='true'>←</span> {t('library.back')}</Link>
          <div className={styles.typeLine}>
            <span className={styles.typeIcon} aria-hidden='true'><Icon name='book-open' size={18} /></span>
            <span>{t(resourceTypeLabelKeys[resource.resourceType])}</span>
            <span className={styles.verified}><Icon name='check-circle' size={16} /> {t('library.verified')}</span>
          </div>
          <h1 lang={contentLanguage(resource.primaryLanguageCode)} dir='auto'>{title}</h1>
          <p className={styles.lede} dir='auto'>{getResourceLede(resource.details, t)}</p>
        </div>
        <aside className={styles.metaRail} aria-label={t('library.metadata')}>
          <span className={styles.metaLabel}>{t('library.publicResource')}</span>
          <span className={styles.metaValue}>{resource.primaryLanguageCode.toUpperCase()}{resource.secondaryLanguageCode ? ` · ${resource.secondaryLanguageCode.toUpperCase()}` : ''}</span>
          {resource.cefrLevel ? <span className={styles.metaValue}>CEFR {resource.cefrLevel}</span> : null}
          <div className={styles.topicList}>{resource.topics.map((topic) => <span key={topic}>#{topic}</span>)}</div>
        </aside>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.content} aria-labelledby='resource-content-heading'>
          <p className={styles.eyebrow}>{t('library.contentEyebrow')}</p>
          <h2 id='resource-content-heading'>{t('library.content')}</h2>
          <DetailsContent details={resource.details} primaryLanguage={resource.primaryLanguageCode} secondaryLanguage={resource.secondaryLanguageCode} />
        </section>
        <aside className={styles.notes} aria-label={t('library.usage')}>
          <div className={styles.noteMark}>02</div>
          <h2>{t('library.readLearnCredit')}</h2>
          <p>{t('library.readOnly')}</p>
        </aside>
      </div>

      <LibraryLearnFromResourcePanel resource={resource} />
      <LibraryAttributionList entries={resource.provenance} detail />
    </article>
  );
}

function DetailsContent({ details, primaryLanguage, secondaryLanguage }: { details: LibraryResourceDetails; primaryLanguage: string; secondaryLanguage: string | null }) {
  const { t } = useUiLocale();
  switch (details.resourceType) {
    case 'VOCABULARY':
      return <div className={styles.detailStack} dir='auto'><div className={styles.term} lang={contentLanguage(primaryLanguage)} dir='auto'>{details.term}</div><p>{details.definition}</p>{details.partOfSpeech ? <p className={styles.secondary}>{details.partOfSpeech}</p> : null}{details.exampleSentence ? <blockquote lang={contentLanguage(primaryLanguage)} dir='auto'>{details.exampleSentence}</blockquote> : null}</div>;
    case 'SENTENCE':
      return <div className={styles.detailStack} dir='auto'><p className={styles.quoteText} lang={contentLanguage(primaryLanguage)} dir='auto'>{details.text}</p>{details.context ? <p className={styles.secondary}>{details.context}</p> : null}</div>;
    case 'TRANSLATION':
      return <div className={styles.translation}><div><span>{t('library.sourceText')}</span><p lang={contentLanguage(primaryLanguage)} dir='auto'>{details.sourceText}</p></div><div><span>{t('library.translatedText')}</span><p lang={contentLanguage(secondaryLanguage)} dir='auto'>{details.translatedText}</p></div></div>;
    case 'GRAMMAR_ITEM':
      return <div className={styles.detailStack} dir='auto'><p>{details.explanation}</p>{details.pattern ? <pre>{details.pattern}</pre> : null}{details.exampleText ? <blockquote lang={contentLanguage(primaryLanguage)} dir='auto'>{details.exampleText}</blockquote> : null}</div>;
    case 'DIALOGUE':
      return <div className={styles.dialogue}>{details.turns.map((turn, index) => <div className={styles.turn} key={`${turn.speaker}-${index}`}><span>{turn.speaker}</span><div><p lang={contentLanguage(primaryLanguage)} dir='auto'>{turn.text}</p>{turn.translation ? <p className={styles.secondary} lang={contentLanguage(secondaryLanguage)} dir='auto'>{turn.translation}</p> : null}</div></div>)}</div>;
    case 'IDIOM':
      return <div className={styles.detailStack} dir='auto'><div className={styles.term} lang={contentLanguage(primaryLanguage)} dir='auto'>{details.expression}</div><p>{details.meaning}</p>{details.usageNote ? <blockquote>{details.usageNote}</blockquote> : null}</div>;
    case 'SLANG':
      return <div className={styles.detailStack} dir='auto'><div className={styles.term} lang={contentLanguage(primaryLanguage)} dir='auto'>{details.expression}</div><p>{details.meaning}</p>{details.register ? <p className={styles.secondary}>{details.register}</p> : null}{details.usageNote ? <blockquote>{details.usageNote}</blockquote> : null}</div>;
    case 'CULTURAL_NOTE':
      return <div className={styles.detailStack} dir='auto'><p>{details.body}</p></div>;
    case 'PRONUNCIATION':
      return <div className={styles.detailStack} dir='auto'><div className={styles.term} lang={contentLanguage(primaryLanguage)} dir='auto'>{details.term}</div><p className={styles.phonetic}>{details.phonetic}</p>{details.notes ? <p>{details.notes}</p> : null}</div>;
    case 'LEARNING_COLLECTION':
      return <div className={styles.detailStack} dir='auto'><p>{details.description}</p></div>;
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

function getResourceLede(details: LibraryResourceDetails, t: (key: TranslationKey) => string): string {
  switch (details.resourceType) {
    case 'VOCABULARY': return details.definition;
    case 'SENTENCE': return details.context ?? t('library.sentenceFallback');
    case 'TRANSLATION': return details.translatedText;
    case 'GRAMMAR_ITEM': return details.explanation;
    case 'DIALOGUE': return details.turns[0]?.text ?? t('library.dialogueFallback');
    case 'IDIOM': return details.meaning;
    case 'SLANG': return details.meaning;
    case 'CULTURAL_NOTE': return details.body;
    case 'PRONUNCIATION': return details.phonetic;
    case 'LEARNING_COLLECTION': return details.description;
  }
}
