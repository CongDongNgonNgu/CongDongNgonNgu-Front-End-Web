import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { Button } from '../../../components/ui/Button/Button';
import type { StructuredResponseResponse } from '../corrections.types';
import { StructuredResponseDiff } from './StructuredResponseDiff';
import styles from './StructuredResponse.module.css';

interface StructuredResponseCardProps {
  response: StructuredResponseResponse;
  originalText: string;
  authenticated: boolean;
  pendingAction: string | null;
  actionError: string | null;
  onAuthRequired: () => void;
  onHelpful: (response: StructuredResponseResponse) => void;
  onAccept: (response: StructuredResponseResponse) => void;
  onNominateCandidate: (response: StructuredResponseResponse) => void;
}


export function StructuredResponseCard({
  response,
  originalText,
  authenticated,
  pendingAction,
  actionError,
  onAuthRequired,
  onHelpful,
  onAccept,
  onNominateCandidate,
}: StructuredResponseCardProps) {
  const { t, formatNumber, formatDate: formatLocaleDate } = useUiLocale();
  const responseLabel = response.responseKind === 'CORRECTION_PROPOSAL' ? t('community.detail.correction.proposal') : t('community.detail.answer');
  const acceptLabel = response.responseKind === 'CORRECTION_PROPOSAL' ? t('community.detail.accept.correction') : t('community.detail.accept.answer');
  const authorName = response.author?.displayName ?? t('community.detail.anonymous.member');

  return (
    <article className={styles.responseCard} aria-label={t('community.detail.by', {kind: responseLabel, name: authorName})}>
      <div className={styles.responseHeader}>
        <div className={styles.author}>
          <span className={styles.avatar} aria-hidden='true'>{authorName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong className={styles.authorName}>{authorName}</strong>
            <time dateTime={response.createdAt}>{formatLocaleDate(response.createdAt, {dateStyle: 'medium', timeStyle: 'short'})}</time>
          </div>
        </div>
        {response.isAccepted && !response.isDeleted ? <span className={styles.accepted}>{t('community.detail.accepted.by.the.requester')}</span> : null}
      </div>
      {response.isDeleted ? (
        <p className={styles.muted} role='status'>{t('community.detail.this.response.is.no.longer.available')}</p>
      ) : (
        <>
          {response.responseKind === 'CORRECTION_PROPOSAL' && response.correctedText ? (
            <StructuredResponseDiff original={originalText} corrected={response.correctedText} />
          ) : (
            <div className={styles.originalBlock}>
              <p className={styles.eyebrow}>{t('community.detail.answer.content')}</p>
              <p>{response.answerText}</p>
            </div>
          )}
          {response.explanation ? <p className={styles.explanation}>{response.explanation}</p> : null}
          <div className={styles.responseActions}>
            {response.canVote || !authenticated ? (
              <Button
                variant='quiet'
                size='sm'
                aria-pressed={response.viewerHelpful}
                onClick={() => authenticated ? onHelpful(response) : onAuthRequired()}
                disabled={Boolean(pendingAction)}
              >
                {t(response.responseKind === 'QA_ANSWER' ? 'community.detail.answerHelpful' : 'community.detail.proposalHelpful')}{response.helpfulCount ? ' · ' + formatNumber(response.helpfulCount) : ''}
              </Button>
            ) : null}
            {response.canAccept ? (
              <Button
                variant={response.isAccepted ? 'secondary' : 'primary'}
                size='sm'
                onClick={() => onAccept(response)}
                loading={pendingAction === 'accept:' + response.id}
              >
                {response.isAccepted ? t('community.detail.unaccept') : acceptLabel}
              </Button>
            ) : null}
            {response.libraryCandidateState === 'PENDING_REVIEW' ? (
              <span className={styles.candidateStatus} role='status'>{t('community.detail.submitted.for.review.not.yet.verified')}</span>
            ) : null}
            {response.canNominateCandidate ? (
              <Button
                variant='quiet'
                size='sm'
                onClick={() => onNominateCandidate(response)}
                loading={pendingAction === 'candidate:' + response.id}
              >
                {t('community.detail.nominate.for.the.library')}</Button>
            ) : null}
          </div>
          {actionError ? <p className={styles.error} role='alert'>{actionError}</p> : null}
        </>
      )}
    </article>
  );
}
