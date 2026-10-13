import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/FormControls';
import { useAuth } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { correctionsApi } from '../api/corrections-api';
import {
  CommunityRequestPageLayout,
  RequestAccessLoadingState,
  RequestRedirectingState,
} from '../components/CommunityRequestPageLayout';
import { CatalogError, TargetLanguageSelect } from '../components/TargetLanguageSelect';
import { RequestMetadataFields } from '../components/RequestMetadataFields';
import { communityRequestErrorMessage } from '../corrections-errors';
import {
  buildQuestionPayload,
  validateQuestionInput,
  type QuestionFormInput,
  type QuestionValidationErrors,
  MAX_CORRECTION_TEXT_CODE_POINTS,
} from '../corrections-validation';
import type { CommunityLanguageCatalogApi, CommunityRequestApi } from '../corrections.types';
import { countUnicodeCodePoints } from '../community-validation';
import styles from './CommunityRequestPage.module.css';

interface CommunityQuestionRequestPageProps {
  api?: CommunityRequestApi;
  catalogApi?: CommunityLanguageCatalogApi;
}

export function CommunityQuestionRequestPage({
  api = correctionsApi,
  catalogApi = languageApi,
}: CommunityQuestionRequestPageProps) {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [location.pathname, navigate, status]);

  if (status === 'loading') return <RequestAccessLoadingState />;
  if (status !== 'authenticated') return <RequestRedirectingState />;
  return <CommunityQuestionRequestPageView api={api} catalogApi={catalogApi} />;
}

export interface CommunityQuestionRequestPageViewProps {
  api: CommunityRequestApi;
  catalogApi: CommunityLanguageCatalogApi;
}

export function CommunityQuestionRequestPageView({
  api,
  catalogApi,
}: CommunityQuestionRequestPageViewProps) {
  const { t, locale, formatNumber } = useUiLocale();
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState(false);
  const [input, setInput] = useState<QuestionFormInput>({
    languageCode: '',
    content: '',
    cefrLevel: '',
    topic: '',
    visibility: 'PUBLIC',
  });
  const [errors, setErrors] = useState<QuestionValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLanguages = useCallback(async () => {
    setLanguagesLoading(true);
    setLanguagesError(false);
    try {
      const result = await catalogApi.listLanguages();
      setLanguages(result.filter((language) => language.active));
    } catch {
      setLanguages([]);
      setLanguagesError(true);
    } finally {
      setLanguagesLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    void loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("community.posts.ask.a.question.congdongngonngu.vn");
    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  const update = (field: keyof QuestionFormInput, value: string) => {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateQuestionInput(input, locale);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const post = await api.createQuestion(buildQuestionPayload(input));
      if (!post?.id) throw new Error('QUESTION_POST_ID_MISSING');
      navigate('/community/posts/' + encodeURIComponent(post.id));
    } catch (error) {
      setSubmitError(communityRequestErrorMessage(error, 'question', locale));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CommunityRequestPageLayout
      breadcrumb={t("community.posts.ask.a.question")}
      eyebrow={t("community.posts.ask.a.question.alternative")}
      title={t("community.posts.ask.a.question")}
      description={t("community.posts.ask.a.specific.question.to.explore.a.language")}
      guidanceCards={[
        {
          icon: 'users',
          title: t("community.posts.a.thoughtful.learning.community"),
          tone: 'accent',
          description: t("community.posts.every.question.is.an.opportunity.to.share.knowledge"),
        },
        {
          icon: 'check-circle',
          title: t("community.posts.tips.for.effective.questions"),
          items: [
            { label: t("community.posts.provide.clear.context"), text: t("community.posts.where.did.you.find.this.sentence.and.in") },
            { label: t("community.posts.keep.the.original.sentence"), text: t("community.posts.keep.the.original.wording.so.contributors.can.understand") },
            { label: t("community.posts.listen.to.different.perspectives"), text: t("community.posts.welcome.perspectives.from.members.and.native.speakers.from") },
          ],
        },
        {
          icon: 'circle-help',
          title: t("community.posts.need.help.using.this.feature"),
          description: t("community.posts.read.the.guidance.or.contact.the.community.administrators"),
          link: { label: t("community.posts.view.question.and.answer.guidance"), to: '/community' },
        },
      ]}
    >
      <div className={styles.formCard}>
        <h2 id='community-request-form-heading' className={styles.visuallyHidden}>{t("community.posts.your.question")}</h2>

        <form className={styles.form} onSubmit={submit} noValidate>
          {languagesError ? <CatalogError onRetry={() => void loadLanguages()} /> : null}

          <TargetLanguageSelect
            id='question-language'
            value={input.languageCode}
            languages={languages}
            loading={languagesLoading}
            error={errors.languageCode}
            onChange={(value) => update('languageCode', value)}
          />

          <Textarea
            id='question-content'
            label={t("community.posts.question.text")}
            value={input.content}
            onChange={(event) => update('content', event.target.value)}
            error={errors.content}
            hint={t("community.posts.you.can.keep.the.original.spacing.and.line")}
            required
          />
          <p className={styles.charCount} aria-live='polite'>
            {t('community.posts.characterCount', { count: countUnicodeCodePoints(input.content), max: formatNumber(MAX_CORRECTION_TEXT_CODE_POINTS) })}</p>

          <div className={styles.examples} aria-label={t("community.posts.example.questions")}>
            <strong>{t("community.posts.ways.to.start")}</strong>
            <span>{t("community.posts.what.is.the.difference.between.these.two.expressions")}</span>
            <span>{t("community.posts.when.would.i.use.this.sentence")}</span>
            <span>{t("community.posts.does.this.word.sound.natural.in.conversation")}</span>
            <span>{t("community.posts.how.does.the.grammar.in.this.sentence.work")}</span>
          </div>

          <RequestMetadataFields
            idPrefix='question'
            cefrLevel={input.cefrLevel}
            topic={input.topic}
            visibility={input.visibility as 'PUBLIC' | 'PRIVATE'}
            errors={errors}
            onChange={(field, value) => update(field, value)}
          />

          {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
          <p className={styles.submitStatus} aria-live='polite' aria-atomic='true'>
            {isSubmitting ? t("community.posts.sending.your.question") : ''}
          </p>

          <div className={[styles.formActions, styles.formActionsQuestion].join(' ')}>
            <span className={styles.actionReassurance}>
              {t("community.posts.clear.questions.with.real.context.help.the.community")}</span>
            <div className={styles.actionButtons}>
              <Link className={styles.cancelLink} to='/community'>{t("community.posts.cancel")}</Link>
              <Button type='submit' loading={isSubmitting}>{t("community.posts.post.question")}</Button>
            </div>
          </div>
        </form>
      </div>
    </CommunityRequestPageLayout>
  );
}
