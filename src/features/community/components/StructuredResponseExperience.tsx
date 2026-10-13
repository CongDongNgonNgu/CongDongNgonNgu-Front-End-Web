import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import type { CommunityPost } from '../community.types';
import type {
  CommunityRequestApi,
  CommunityStructuredResponseApi,
  CorrectionRequestResponse,
  StructuredResponseInput,
  StructuredResponseResponse,
} from '../corrections.types';
import { StructuredResponseCard } from './StructuredResponseCard';
import { StructuredResponseEditor } from './StructuredResponseEditor';
import styles from './StructuredResponse.module.css';

const RESPONSE_PAGE_SIZE = 20;

interface StructuredResponseExperienceProps {
  parent: CommunityPost;
  authenticated: boolean;
  api: CommunityStructuredResponseApi;
  requestApi: Pick<CommunityRequestApi, 'getCorrectionRequest'>;
  onAuthRequired: () => void;
}

function isStructuredParent(post: CommunityPost): boolean {
  return post.postType === 'CORRECTION_REQUEST' || post.postType === 'QUESTION';
}

function errorMessage(error: unknown, t: ReturnType<typeof useUiLocale>['t'], fallback: string): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'CORRECTIONS_RATE_LIMITED') return t('community.detail.you.have.made.many.requests.please.try.again.shortly');
    if (code === 'CORRECTIONS_ACCEPT_FORBIDDEN') return t('community.detail.only.the.requester.can.accept.an.answer');
    if (code === 'CORRECTIONS_SELF_VOTE') return t('community.detail.you.cannot.mark.your.own.response.as.helpful');
    if (code === 'CORRECTIONS_ACCEPTANCE_CONFLICT') return t('community.detail.the.selection.changed.please.reload.the.list');
    if (code === 'CORRECTIONS_CANDIDATE_NOT_ACCEPTED') return t('community.detail.only.a.currently.accepted.response.can.be.nominated');
    if (code === 'CORRECTIONS_CANDIDATE_SOURCE_NOT_PUBLIC') return t('community.detail.only.public.content.can.be.nominated.for.the.library');
    if (code === 'CORRECTIONS_CANDIDATE_FORBIDDEN') return t('community.detail.only.the.requester.can.nominate.a.response');
  }
  return fallback;
}

function replaceResponse(
  responses: StructuredResponseResponse[],
  replacement: StructuredResponseResponse,
): StructuredResponseResponse[] {
  return responses.map((item) => item.id === replacement.id ? replacement : item);
}

export function StructuredResponseExperience({
  parent,
  authenticated,
  api,
  requestApi,
  onAuthRequired,
}: StructuredResponseExperienceProps) {
  const { t } = useUiLocale();
  const [correction, setCorrection] = useState<CorrectionRequestResponse | null>(null);
  const [responses, setResponses] = useState<StructuredResponseResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<{ cause: unknown } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);

  const isCorrection = parent.postType === 'CORRECTION_REQUEST';
  const kind = isCorrection ? ('CORRECTION_PROPOSAL' as const) : ('QA_ANSWER' as const);
  const originalText = isCorrection ? correction?.correction.originalText ?? '' : parent.content;
  const sectionTitle = isCorrection ? t('community.detail.correction.proposal') : t('community.detail.answers');
  const emptyText = isCorrection
    ? t('community.detail.no.corrections.yet.be.the.first.to.suggest.a.correction')
    : t('community.detail.no.answers.yet.share.your.perspective.to.help.the.requester');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const responsePromise = api.listStructuredResponses(parent.id, { limit: RESPONSE_PAGE_SIZE }, authenticated);
      const correctionPromise = isCorrection
        ? requestApi.getCorrectionRequest(parent.id, authenticated)
        : Promise.resolve(null);
      const [result, correctionResult] = await Promise.all([responsePromise, correctionPromise]);
      setResponses(result.items);
      setNextCursor(result.nextCursor);
      setCorrection(correctionResult);
    } catch (error) {
      setResponses([]);
      setNextCursor(null);
      setLoadError({ cause: error });
    } finally {
      setLoading(false);
    }
  }, [api, authenticated, isCorrection, parent.id, requestApi]);

  useEffect(() => {
    if (isStructuredParent(parent)) void load();
  }, [load, parent]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.listStructuredResponses(
        parent.id,
        { limit: RESPONSE_PAGE_SIZE, cursor: nextCursor },
        authenticated,
      );
      setResponses((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setActionError(errorMessage(error, t, t('community.detail.could.not.load.more.responses')));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleHelpful = async (response: StructuredResponseResponse) => {
    if (!authenticated) {
      onAuthRequired();
      return;
    }
    setPendingAction('helpful:' + response.id);
    setActionError(null);
    try {
      const updated = response.viewerHelpful
        ? await api.removeStructuredResponseHelpful(response.id)
        : await api.addStructuredResponseHelpful(response.id);
      setResponses((current) => replaceResponse(current, updated));
    } catch (error) {
      setActionError(errorMessage(error, t, t('community.detail.could.not.update.helpfulness')));
    } finally {
      setPendingAction(null);
    }
  };

  const handleAccept = async (response: StructuredResponseResponse) => {
    if (response.isAccepted) {
      setPendingAction('accept:' + response.id);
      setActionError(null);
      try {
        await api.revokeStructuredResponseAcceptance(parent.id);
        setResponses((current) => current.map((item) => ({ ...item, isAccepted: false, acceptedAt: null })));
      } catch (error) {
        setActionError(errorMessage(error, t, t('community.detail.could.not.unaccept.the.response')));
      } finally {
        setPendingAction(null);
      }
      return;
    }
    if (responses.some((item) => item.isAccepted) && !window.confirm(t('community.detail.replace.the.accepted.answer'))) return;
    setPendingAction('accept:' + response.id);
    setActionError(null);
    try {
      const accepted = await api.acceptStructuredResponse(parent.id, response.id);
      setResponses((current) => current.map((item) => ({
        ...item,
        isAccepted: item.id === accepted.id,
        acceptedAt: item.id === accepted.id ? accepted.acceptedAt : null,
      })));
    } catch (error) {
      setActionError(errorMessage(error, t, t('community.detail.could.not.accept.the.response')));
    } finally {
      setPendingAction(null);
    }
  };

  const handleNominateCandidate = async (response: StructuredResponseResponse) => {
    if (!authenticated) {
      onAuthRequired();
      return;
    }
    setPendingAction('candidate:' + response.id);
    setActionError(null);
    try {
      const candidate = await api.nominateStructuredResponseAsLibraryCandidate(response.id);
      setResponses((current) => current.map((item) => item.id === response.id ? {
        ...item,
        libraryCandidateState: candidate.state,
        canNominateCandidate: false,
      } : item));
    } catch (error) {
      setActionError(errorMessage(error, t, t('community.detail.could.not.submit.the.library.nomination')));
    } finally {
      setPendingAction(null);
    }
  };

  const handleEditorSubmit = async (input: StructuredResponseInput) => {
    setEditorBusy(true);
    setEditorError(null);
    try {
      const created = await api.createStructuredResponse(parent.id, input);
      setResponses((current) => [created, ...current]);
      setEditorVersion((current) => current + 1);
    } catch (error) {
      setEditorError(errorMessage(error, t, t('community.detail.could.not.send.your.response.your.draft.is.preserved.so')));
    } finally {
      setEditorBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby='structured-responses-title'>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{isCorrection ? t('community.detail.learn.with.the.community') : t('community.detail.questions.and.answers')}</p>
          <h2 id='structured-responses-title'>{sectionTitle}</h2>
        </div>
        <span className={styles.status}>{t('community.detail.responseCount', { count: responses.length })}</span>
      </div>

      {isCorrection && correction && originalText !== parent.content ? <div className={styles.originalBlock}>
        <p className={styles.eyebrow}>{isCorrection ? t('community.detail.original.for.review') : t('community.detail.learner.question')}</p>
        <p>{originalText}</p>
      </div> : null}
      {correction?.correction.context ? <p className={styles.muted}>{correction.correction.context}</p> : null}

      {loading ? (
        <p className={styles.status} role='status' aria-live='polite'>{t('community.detail.loading.responses')}</p>
      ) : loadError ? (
        <div role='alert'>
          <p className={styles.error}>{errorMessage(loadError.cause, t, t('community.detail.could.not.load.responses'))}</p>
          <Button variant='secondary' size='sm' onClick={() => void load()}>{t('community.detail.try.again')}</Button>
        </div>
      ) : responses.length ? (
        <div className={styles.responseList}>
          {responses.map((response) => (
            <StructuredResponseCard
              key={response.id}
              response={response}
              originalText={originalText}
              authenticated={authenticated}
              pendingAction={pendingAction}
              actionError={actionError}
              onAuthRequired={onAuthRequired}
              onHelpful={(item) => void handleHelpful(item)}
              onAccept={(item) => void handleAccept(item)}
              onNominateCandidate={(item) => void handleNominateCandidate(item)}
            />
          ))}
          {nextCursor ? (
            <Button
              className={styles.loadMore}
              variant='quiet'
              onClick={() => void handleLoadMore()}
              loading={loadingMore}
            >
              {t('community.detail.load.more.responses')}</Button>
          ) : null}
        </div>
      ) : (
        <p className={styles.empty} role='status'>{emptyText}</p>
      )}

      {parent.isOwner ? (
        <p className={styles.muted}>{t('community.detail.you.are.the.requester.choose.the.most.helpful.response.when')}</p>
      ) : !isCorrection || correction ? (
        <StructuredResponseEditor
          key={editorVersion}
          kind={kind}
          originalText={originalText}
          authenticated={authenticated}
          busy={editorBusy}
          error={editorError}
          onAuthRequired={onAuthRequired}
          onSubmit={handleEditorSubmit}
        />
      ) : null}
    </section>
  );
}
