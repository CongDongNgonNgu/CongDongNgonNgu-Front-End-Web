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
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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
}: StructuredResponseCardProps) {
  const responseLabel = response.responseKind === 'CORRECTION_PROPOSAL' ? 'Đề xuất sửa câu' : 'Câu trả lời';
  const acceptLabel = response.responseKind === 'CORRECTION_PROPOSAL' ? 'Chấp nhận bản sửa' : 'Chấp nhận câu trả lời';
  const authorName = response.author?.displayName ?? 'Thành viên ẩn danh';

  return (
    <article className={styles.responseCard} aria-label={responseLabel + ' của ' + authorName}>
      <div className={styles.responseHeader}>
        <div className={styles.author}>
          <span className={styles.avatar} aria-hidden='true'>{authorName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong className={styles.authorName}>{authorName}</strong>
            <time dateTime={response.createdAt}>{formatDate(response.createdAt)}</time>
          </div>
        </div>
        {response.isAccepted ? <span className={styles.accepted}>Được người hỏi chấp nhận</span> : null}
      </div>
      {response.isDeleted ? (
        <p className={styles.muted} role='status'>Phản hồi này không còn khả dụng.</p>
      ) : (
        <>
          {response.responseKind === 'CORRECTION_PROPOSAL' && response.correctedText ? (
            <StructuredResponseDiff original={originalText} corrected={response.correctedText} />
          ) : (
            <div className={styles.originalBlock}>
              <p className={styles.eyebrow}>Nội dung trả lời</p>
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
                Hữu ích{response.helpfulCount ? ' · ' + response.helpfulCount : ''}
              </Button>
            ) : null}
            {response.canAccept ? (
              <Button
                variant={response.isAccepted ? 'secondary' : 'primary'}
                size='sm'
                onClick={() => onAccept(response)}
                loading={pendingAction === 'accept:' + response.id}
              >
                {response.isAccepted ? 'Bỏ chấp nhận' : acceptLabel}
              </Button>
            ) : null}
          </div>
          {actionError ? <p className={styles.error} role='alert'>{actionError}</p> : null}
        </>
      )}
    </article>
  );
}
