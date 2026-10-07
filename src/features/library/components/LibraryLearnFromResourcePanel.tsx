import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { libraryLearningErrorKey } from '../library.errors';
import { resourceTypeLabelKey } from '../library.presentation';
import type { viErrors } from '../../ui-locale/catalogs/errors';
import { useOptionalAuth } from '../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import type { LibraryPublicResource } from '../library.types';
import { AiLearningApi, aiLearningApi } from '../../ai/learning/ai-learning.api';
import type { AiLearningRequestClient, AiLearningResult } from '../../ai/learning/ai-learning.types';
import styles from './LibraryLearnFromResourcePanel.module.css';

interface LibraryLearnFromResourcePanelProps {
  resource: LibraryPublicResource;
  api?: { learn: (input: { resourceId: string }) => Promise<AiLearningResult> };
  requestClient?: AiLearningRequestClient;
  authenticated?: boolean;
}

export function LibraryLearnFromResourcePanel({
  resource,
  api,
  requestClient,
  authenticated: authenticatedOverride,
}: LibraryLearnFromResourcePanelProps) {
  const { t } = useUiLocale();
  const auth = useOptionalAuth();
  const authenticated = authenticatedOverride ?? auth?.status === 'authenticated';
  const learningApi = api ?? (requestClient ? new AiLearningApi(requestClient) : auth ? new AiLearningApi(auth.api) : aiLearningApi);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<keyof typeof viErrors | null>(null);
  const [result, setResult] = useState<AiLearningResult | null>(null);

  async function learn() {
    if (!authenticated || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      setResult(await learningApi.learn({ resourceId: resource.id }));
    } catch (requestError) {
      setResult(null);
      setError(libraryLearningErrorKey(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby='learn-from-resource-heading'>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{t('library.learnEyebrow')}</p>
          <h2 id='learn-from-resource-heading'>{t('library.learnTitle')}</h2>
          <p className={styles.lede}>{t('library.learnDescription')}</p>
        </div>
        <div className={styles.actionRail}>
          <span className={styles.sourceCue}>{t('library.sourceCue', { state: t('library.verified'), language: resource.primaryLanguageCode.toUpperCase() })}</span>
          <Button variant='secondary' size='lg' loading={isLoading} disabled={!authenticated} onClick={() => void learn()}>
            {isLoading ? t('library.analyzing') : t('library.learnAction')}
          </Button>
        </div>
      </div>

      {!authenticated ? (
        <div className={styles.authNotice} role='note'>
          <div><strong>{t('library.learnSignInTitle')}</strong><p>{t('library.learnSignInDescription')}</p></div>
          <Link to='/login' state={{ from: `/library/${resource.id}` }}>{t('library.learnSignIn')}</Link>
        </div>
      ) : null}
      {isLoading ? <div className={styles.loading} role='status' aria-live='polite' aria-busy='true'>{t('library.learnLoading')}</div> : null}
      {error ? <div className={styles.error} role='alert'><div><strong>{t('library.learnError')}</strong><p>{t(error)}</p></div><Button variant='quiet' size='sm' onClick={() => void learn()} disabled={!authenticated}>{t('library.retry')}</Button></div> : null}
      {result ? <LearningResult result={result} /> : null}
    </section>
  );
}

function LearningResult({ result }: { result: AiLearningResult }) {
  const { t } = useUiLocale();
  const output = result.output;
  const sourceLink = result.sourceResource.provenance
    .map((entry) => safeExternalUrl(entry.sourceUrl))
    .find((entry): entry is string => Boolean(entry)) ?? null;
  return (
    <div className={styles.result}>
      <div className={styles.aiNotice} role='note'>
        <strong>{t('library.aiNotice')}</strong>
        <p>{t('library.aiNoticeDescription')}</p>
      </div>
      <div className={styles.resultHeading}>
        <div><p className={styles.eyebrow}>{t('library.structuredResult')}</p><h3 dir='auto'>{output.summary}</h3></div>
        <span className={styles.sourceBadge}>{t('library.aiBadge')}</span>
      </div>
      <p className={styles.attributionLine}>
        {t('library.basedOnSource', { type: t(resourceTypeLabelKey(result.sourceResource.resourceType)) })}
        {sourceLink ? <a href={sourceLink} target='_blank' rel='noreferrer'>{t('library.viewSource')}</a> : t('library.sourceRecorded')}
      </p>
      <div className={styles.sectionGrid}>
        <StudySection title={t('library.studyVocabulary')}>
          <div className={styles.vocabularyList}>{output.vocabulary.map((item) => <article className={styles.item} dir='auto' key={`${item.term}-${item.meaning}`}><strong>{item.term}</strong><p>{item.meaning}</p><span>{item.exampleSentence}</span></article>)}</div>
        </StudySection>
        <StudySection title={t('library.studyGrammar')}>
          <div className={styles.itemList}>{output.grammarNotes.map((item) => <article className={styles.item} dir='auto' key={`${item.title}-${item.example}`}><strong>{item.title}</strong><p>{item.explanation}</p><span>{item.example}</span></article>)}</div>
        </StudySection>
        <StudySection title={t('library.studyQuestions')}>
          <ol className={styles.numberedList}>{output.questions.map((item) => <li key={item.question}><strong>{item.question}</strong><span>{t('library.answerGuide', { text: item.answerGuide })}</span></li>)}</ol>
        </StudySection>
        <StudySection title={t('library.studyQuiz')}>
          <div className={styles.quizList}>{output.miniQuiz.map((item, index) => <details className={styles.quizItem} key={`${item.question}-${index}`}><summary>{item.question}</summary><ol>{item.options.map((option, optionIndex) => <li key={option} className={optionIndex === item.correctOptionIndex ? styles.correctOption : undefined}>{option}</li>)}</ol><p>{item.explanation}</p></details>)}</div>
        </StudySection>
        <StudySection title={t('library.studySpeaking')}>
          <div className={styles.itemList}>{output.speakingPrompts.map((item) => <article className={styles.item} key={`${item.prompt}-${item.followUp}`}><strong>{item.prompt}</strong><span>{t('library.followUp', { text: item.followUp })}</span></article>)}</div>
        </StudySection>
      </div>
    </div>
  );
}

function StudySection({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = title.replace(/ /g, '-');
  return <section className={styles.studySection} aria-labelledby={headingId}><h4 id={headingId}>{title}</h4>{children}</section>;
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
