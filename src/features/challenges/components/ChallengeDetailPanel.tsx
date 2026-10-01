import { Link } from 'react-router-dom';
import { Badge, Card } from '../../../components/ui/Surface';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import type { AuthStatus } from '../../auth/AuthProvider';
import type { ChallengePublicDetail, ChallengePublicProgress } from '../challenge.types';
import { challengeStateLabel, challengeStateTone, challengeTypeLabel, formatDate, goalLabel, participantLabel } from '../challenge.formatters';
import styles from './ChallengeDetailPanel.module.css';

interface ChallengeDetailPanelProps {
  detail: ChallengePublicDetail;
  progress: ChallengePublicProgress | null;
  authStatus: AuthStatus;
  actionLoading: boolean;
  actionError: string | null;
  onJoin: () => void;
  onLeave: () => void;
}

export function ChallengeDetailPanel({
  detail,
  progress,
  authStatus,
  actionLoading,
  actionError,
  onJoin,
  onLeave,
}: ChallengeDetailPanelProps) {
  const canWrite = detail.state === 'ACTIVE' || detail.state === 'UPCOMING';
  const isCompleted = progress?.status === 'COMPLETED';
  const isJoined = progress?.status === 'JOINED';

  return (
    <Card as='section' className={styles.panel} aria-labelledby='challenge-detail-title'>
      <div className={styles.panelHeader}>
        <div className={styles.badges}>
          <Badge tone={challengeStateTone(detail.state)}>{challengeStateLabel(detail.state)}</Badge>
          <span className={styles.type}>{challengeTypeLabel(detail.challengeType)} · {detail.languageCode.toUpperCase()}</span>
        </div>
        <span className={styles.participants}><Icon name='users' size={16} />{participantLabel(detail.participantCount)}</span>
      </div>

      <div className={styles.heading}>
        <h2 id='challenge-detail-title'>{detail.title}</h2>
        <p>{detail.description}</p>
      </div>

      <dl className={styles.facts}>
        <div><dt>Thời gian</dt><dd>{formatDate(detail.startAt, detail.timezone)} — {formatDate(detail.endAt, detail.timezone)}</dd></div>
        <div><dt>Múi giờ</dt><dd>{detail.timezone}</dd></div>
        <div><dt>Mục tiêu hữu hạn</dt><dd>{goalLabel(detail.goal)}</dd></div>
        {detail.level ? <div><dt>Trình độ</dt><dd>{detail.level}</dd></div> : null}
        {detail.topic ? <div><dt>Chủ đề</dt><dd>{detail.topic}</dd></div> : null}
      </dl>

      <div className={styles.progressSection} aria-live='polite'>
        <div className={styles.progressHeading}>
          <div>
            <p className={styles.kicker}>TIẾN ĐỘ ĐƯỢC GHI NHẬN</p>
            <h3>{progress ? `${progress.progressValue} / ${progress.goal.target}` : 'Chưa tham gia'}</h3>
          </div>
          {progress ? <span>{progress.completionPercent}%</span> : null}
        </div>
        {progress ? (
          <progress className={styles.progress} max={100} value={progress.completionPercent} aria-label={`Tiến độ ${progress.completionPercent}%`} />
        ) : (
          <p className={styles.progressHint}>Tham gia để xem tiến độ do máy chủ tổng hợp từ hoạt động hợp lệ.</p>
        )}
        {progress?.completedAt ? <p className={styles.completedNote}>Hoàn thành lúc {formatDate(progress.completedAt, detail.timezone)}.</p> : null}
      </div>

      <div className={styles.actionArea}>
        {!canWrite ? <p className={styles.stateNote}><Icon name='info' size={18} />{detail.state === 'CANCELLED' ? 'Thử thách này đã được hủy.' : 'Thử thách đã kết thúc; tiến độ cũ vẫn được giữ để bạn tham khảo.'}</p> : null}
        {canWrite && authStatus === 'loading' ? <Button disabled>Đang kiểm tra phiên đăng nhập</Button> : null}
        {canWrite && authStatus === 'unauthenticated' ? <Link className={styles.loginLink} to='/login'>Đăng nhập để tham gia</Link> : null}
        {canWrite && authStatus === 'authenticated' && isCompleted ? <Button disabled>Đã hoàn thành</Button> : null}
        {canWrite && authStatus === 'authenticated' && isJoined ? <Button variant='quiet' loading={actionLoading} onClick={onLeave}>Rời thử thách</Button> : null}
        {canWrite && authStatus === 'authenticated' && !isCompleted && !isJoined ? <Button loading={actionLoading} onClick={onJoin}>Tham gia thử thách</Button> : null}
        {actionError ? <p className={styles.actionError} role='alert'>{actionError}</p> : null}
      </div>
    </Card>
  );
}
