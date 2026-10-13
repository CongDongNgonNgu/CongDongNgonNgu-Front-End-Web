import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/FormControls';
import { useAuth } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { correctionsApi } from '../api/corrections-api';
import { CorrectionIntentOptions } from '../components/CorrectionIntentOptions';
import {
  CommunityRequestPageLayout,
  RequestAccessLoadingState,
  RequestRedirectingState,
} from '../components/CommunityRequestPageLayout';
import { CatalogError, TargetLanguageSelect } from '../components/TargetLanguageSelect';
import { RequestMetadataFields } from '../components/RequestMetadataFields';
import { communityRequestErrorMessage } from '../corrections-errors';
import {
  buildCorrectionRequestPayload,
  validateCorrectionRequestInput,
  type CorrectionRequestFormInput,
  type CorrectionRequestValidationErrors,
  MAX_CORRECTION_TEXT_CODE_POINTS,
} from '../corrections-validation';
import type { CommunityLanguageCatalogApi, CommunityRequestApi } from '../corrections.types';
import { countUnicodeCodePoints } from '../community-validation';
import styles from './CommunityRequestPage.module.css';

interface CommunityCorrectionRequestPageProps {
  api?: CommunityRequestApi;
  catalogApi?: CommunityLanguageCatalogApi;
}

export function CommunityCorrectionRequestPage({
  api = correctionsApi,
  catalogApi = languageApi,
}: CommunityCorrectionRequestPageProps) {
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
  return <CommunityCorrectionRequestPageView api={api} catalogApi={catalogApi} />;
}

export interface CommunityCorrectionRequestPageViewProps {
  api: CommunityRequestApi;
  catalogApi: CommunityLanguageCatalogApi;
}

export function CommunityCorrectionRequestPageView({
  api,
  catalogApi,
}: CommunityCorrectionRequestPageViewProps) {
  const { t, locale, formatNumber } = useUiLocale();
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState(false);
  const [input, setInput] = useState<CorrectionRequestFormInput>({
    languageCode: '',
    originalText: '',
    correctionIntent: '',
    context: '',
    cefrLevel: '',
    topic: '',
    visibility: 'PUBLIC',
  });
  const [errors, setErrors] = useState<CorrectionRequestValidationErrors>({});
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
    document.title = t("community.posts.ask.for.corrections.congdongngonngu.vn");
    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  const update = (field: keyof CorrectionRequestFormInput, value: string) => {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateCorrectionRequestInput(input, locale);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await api.createCorrectionRequest(buildCorrectionRequestPayload(input));
      if (!response.post?.id) throw new Error('CORRECTION_POST_ID_MISSING');
      navigate('/community/posts/' + encodeURIComponent(response.post.id));
    } catch (error) {
      setSubmitError(communityRequestErrorMessage(error, 'correction', locale));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CommunityRequestPageLayout
      breadcrumb={t("community.posts.ask.the.community.for.corrections")}
      eyebrow={t("community.posts.ask.for.corrections")}
      title={t("community.posts.ask.the.community.for.corrections")}
      description={t("community.posts.share.a.sentence.you.are.learning.for.clear")}
      guidanceCards={[
        {
          icon: 'users',
          title: t("community.posts.a.thoughtful.learning.community"),
          description: t("community.posts.every.sentence.you.share.is.an.opportunity.to"),
        },
        {
          icon: 'sparkles',
          title: t("community.posts.tips.for.useful.feedback"),
          items: [
            { label: t("community.posts.provide.clear.context"), text: t("community.posts.who.will.you.use.this.sentence.with.and") },
            { label: t("community.posts.keep.the.original.sentence"), text: t("community.posts.do.not.worry.about.mistakes.learning.from.real") },
            { label: t("community.posts.listen.to.different.perspectives"), text: t("community.posts.living.languages.offer.different.ways.to.express.yourself") },
          ],
        },
        {
          icon: 'user-round',
          title: t("community.posts.no.automatically.generated.ai.feedback"),
          tone: 'muted',
          description: t("community.posts.feedback.comes.from.real.people.we.do.not"),
        },
      ]}
    >
      <div className={styles.formCard}>
        <h2 id='community-request-form-heading' className={styles.visuallyHidden}>{t("community.posts.submit.a.sentence.for.feedback")}</h2>

        <form className={styles.form} onSubmit={submit} noValidate>
          {languagesError ? <CatalogError onRetry={() => void loadLanguages()} /> : null}

          <TargetLanguageSelect
            id='correction-language'
            value={input.languageCode}
            languages={languages}
            loading={languagesLoading}
            error={errors.languageCode}
            onChange={(value) => update('languageCode', value)}
          />

          <Textarea
            id='correction-original-text'
            label={t("community.posts.sentence.or.text.to.correct")}
            value={input.originalText}
            onChange={(event) => update('originalText', event.target.value)}
            error={errors.originalText}
            hint={t("community.posts.keep.the.original.spacing.and.line.breaks")}
            required
          />
          <p className={styles.charCount} aria-live='polite'>
            {t('community.posts.characterCount', { count: countUnicodeCodePoints(input.originalText), max: formatNumber(MAX_CORRECTION_TEXT_CODE_POINTS) })}</p>

          <CorrectionIntentOptions
            value={input.correctionIntent}
            error={errors.correctionIntent}
            onChange={(value) => update('correctionIntent', value)}
          />

          <RequestMetadataFields
            idPrefix='correction'
            context={{
              value: input.context,
              error: errors.context,
              onChange: (value) => update('context', value),
            }}
            cefrLevel={input.cefrLevel}
            topic={input.topic}
            visibility={input.visibility as 'PUBLIC' | 'PRIVATE'}
            errors={errors}
            onChange={(field, value) => update(field, value)}
          />

          {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
          <p className={styles.submitStatus} aria-live='polite' aria-atomic='true'>
            {isSubmitting ? t("community.posts.sending.your.request") : ''}
          </p>

          <div className={[styles.formActions, styles.formActionsCorrection].join(' ')}>
            <Button type='submit' loading={isSubmitting}>{t("community.posts.send.correction.request")}</Button>
            <Link className={styles.cancelLink} to='/community'>{t("community.posts.cancel")}</Link>
            <span className={styles.actionReassurance}>
              {t("community.posts.follow.the.noncommercial.learning.community.guidelines")}</span>
          </div>
        </form>
      </div>
    </CommunityRequestPageLayout>
  );
}
