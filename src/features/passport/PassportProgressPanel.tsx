import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Surface';
import { Icon } from '../../components/ui/Icon/Icon';
import type {
  CommunityReputationProgress,
  ContributorBadge,
  LearningProgress,
  PassportProgressApi,
} from './passport-progress.types';
import {
  activityLabel,
  badgeDescription,
  badgeStatusLabel,
  badgeTitle,
  formatServerDate,
  milestoneLabel,
} from './passport-progress.utils';
import styles from './PassportProgressPanel.module.css';

type ProgressState = 'loading' | 'ready' | 'error';

interface PassportProgressPanelProps {
  api: PassportProgressApi;
}

export function PassportProgressPanel({ api }: PassportProgressPanelProps) {
  const [state, setState] = useState<ProgressState>('loading');
  const [learning, setLearning] = useState<LearningProgress | null>(null);
  const [community, setCommunity] = useState<CommunityReputationProgress | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgress = useCallback((mode: 'initial' | 'retry' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setState('loading');
    }
    setError(null);
    void Promise.all([api.getLearningProgress(), api.getContributorProgress()])
      .then(([nextLearning, nextCommunity]) => {
        setLearning(nextLearning);
        setCommunity(nextCommunity);
        setState('ready');
      })
      .catch((nextError: unknown) => {
        setError(nextError);
        setState('error');
      })
      .finally(() => setRefreshing(false));
  }, [api]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (state === 'loading') return <ProgressLoading />;
  if (state === 'error' || !learning || !community) {
    return <ProgressError error={error} onRetry={() => loadProgress('retry')} />;
  }

  return (
    <section className={styles.progressPanel} aria-labelledby='passport-progress-title'>
      <header className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Tiến độ server-projected</p>
          <h2 id='passport-progress-title'>Hành trình học và đóng góp</h2>
          <p className={styles.panelIntro}>
            Hai hệ thống độc lập giúp bạn nhìn lại việc học và những đóng góp hữu ích cho cộng đồng.
          </p>
        </div>
        <Button
          variant='quiet'
          size='sm'
          onClick={() => loadProgress('refresh')}
          loading={refreshing}
          aria-label='Làm mới tiến độ học và đóng góp'
        >
          <Icon name='refresh-cw' size={16} />
          Làm mới
        </Button>
      </header>

      <p className={styles.serverNote} role='note'>
        <Icon name='shield-check' size={16} aria-hidden='true' />
        Chỉ số, cấp độ, huy hiệu và chuỗi học tập được xử lý từ dữ liệu máy chủ. Trình duyệt không tự tính lại.
      </p>

      <div className={styles.progressGrid}>
        <LearningSection progress={learning} />
        <CommunitySection progress={community} />
      </div>

      <BadgeSection badges={community.badges} />
      <MilestoneSection progress={learning} />
    </section>
  );
}

function LearningSection({ progress }: { progress: LearningProgress }) {
  const hasRecentActivity = progress.recentQualifyingActivity.length > 0;
  const hasMilestones = progress.milestones.length > 0;

  return (
    <section className={`${styles.progressSection} ${styles.learningSection}`} aria-labelledby='learning-xp-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionKicker}>Hệ thống học tập</p>
          <h3 id='learning-xp-title'>Learning XP</h3>
        </div>
        <Badge tone='warning'>Tiến độ cá nhân</Badge>
      </div>
      <p className={styles.sectionDescription}>
        Điểm học tập đến từ các phiên học và mốc hoàn tất đủ điều kiện, không phải chỉ từ việc mở trang.
      </p>

      <div className={styles.primaryMetric}>
        <span>Tổng Learning XP</span>
        <strong>{formatCount(progress.totalXp)} <small>điểm</small></strong>
        <span>Được chiếu từ máy chủ</span>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statItem}>
          <strong>{formatCount(progress.currentStreak)}</strong>
          <span>Chuỗi hiện tại</span>
          <small>ngày</small>
        </div>
        <div className={styles.statItem}>
          <strong>{formatCount(progress.longestStreak)}</strong>
          <span>Chuỗi dài nhất</span>
          <small>ngày</small>
        </div>
      </div>

      <p className={styles.projectionNote}>
        Chuỗi được máy chủ chiếu theo múi giờ <strong>{progress.streakTimezone}</strong>; đổi múi giờ không tự tạo thêm ngày học.
      </p>

      <div className={styles.subsection}>
        <h4>Hoạt động học gần đây</h4>
        {hasRecentActivity ? (
          <ul className={styles.activityList}>
            {progress.recentQualifyingActivity.slice(0, 5).map((activity) => (
              <li key={`${activity.sourceType}-${activity.completedAt}`}>
                <span>{activityLabel(activity.sourceType)}</span>
                <time dateTime={activity.completedAt}>{formatServerDate(activity.completedAt)}</time>
                <strong>+{formatCount(activity.xp)} XP</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.inlineEmpty}>Chưa có hoạt động học đủ điều kiện để hiển thị.</p>
        )}
      </div>

      {!hasRecentActivity && !hasMilestones ? (
        <p className={styles.newLearnerNote}>Bắt đầu một phiên học hoàn tất để tạo mốc đầu tiên.</p>
      ) : null}
    </section>
  );
}

function CommunitySection({ progress }: { progress: CommunityReputationProgress }) {
  const nextLevel = progress.contributorLevel.nextLevel;

  return (
    <section className={`${styles.progressSection} ${styles.communitySection}`} aria-labelledby='community-reputation-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionKicker}>Hệ thống đóng góp</p>
          <h3 id='community-reputation-title'>Community Reputation</h3>
        </div>
        <Badge tone='success'>Đóng góp hữu ích</Badge>
      </div>
      <p className={styles.sectionDescription}>
        Uy tín phản ánh đóng góp ngôn ngữ được xác minh và tiếp nhận. Đăng nhiều không tự tạo thêm uy tín.
      </p>

      <div className={styles.primaryMetric}>
        <span>Tổng Community Reputation</span>
        <strong>{formatCount(progress.communityReputation)} <small>điểm</small></strong>
        <span>Được chiếu từ máy chủ</span>
      </div>

      <div className={styles.levelSummary}>
        <span>Cấp đóng góp hiện tại</span>
        <strong>{progress.contributorLevel.title}</strong>
        {nextLevel ? (
          <small>Ngưỡng cấp tiếp theo do máy chủ cung cấp: {formatCount(nextLevel.minReputation)} điểm.</small>
        ) : (
          <small>Bạn đang ở cấp đóng góp cao nhất trong danh mục hiện tại.</small>
        )}
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statItem}>
          <strong>{formatCount(progress.activeContributionCount)}</strong>
          <span>Đóng góp đang có hiệu lực</span>
        </div>
      </div>

      {progress.communityReputation === 0 && progress.activeContributionCount === 0 ? (
        <p className={styles.inlineEmpty}>Chưa có đóng góp được xác minh. Khi có dữ liệu, các mốc sẽ xuất hiện ở đây.</p>
      ) : null}
    </section>
  );
}

function BadgeSection({ badges }: { badges: ContributorBadge[] }) {
  return (
    <section className={styles.catalogSection} aria-labelledby='badge-catalog-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionKicker}>Thành tựu hữu hạn</p>
          <h3 id='badge-catalog-title'>Huy hiệu đóng góp</h3>
        </div>
        <Icon name='award' size={20} aria-hidden='true' />
      </div>
      <p className={styles.sectionDescription}>
        Mỗi huy hiệu có tiêu chí hữu hạn và có thể kiểm tra. Trạng thái điều chỉnh bảo toàn lịch sử nhưng không coi đó là hình phạt.
      </p>
      {badges.length > 0 ? (
        <div className={styles.badgeList}>
          {badges.map((badge) => <BadgeDetails key={badge.id} badge={badge} />)}
        </div>
      ) : (
        <p className={styles.inlineEmpty}>Danh mục huy hiệu chưa có dữ liệu.</p>
      )}
    </section>
  );
}

function BadgeDetails({ badge }: { badge: ContributorBadge }) {
  const statusTone = badge.status === 'EARNED' ? 'success' : badge.status === 'REVOKED' ? 'warning' : 'neutral';
  return (
    <details className={styles.badgeDetails}>
      <summary>
        <span className={styles.badgeSummaryCopy}>
          <strong>{badgeTitle(badge)}</strong>
          <span>{badgeStatusLabel(badge.status)}</span>
        </span>
        <Badge tone={statusTone}>{badgeStatusLabel(badge.status)}</Badge>
      </summary>
      <div className={styles.badgeCriteria}>
        <p>{badgeDescription(badge)}</p>
        <p>Cần {formatCount(badge.threshold)} nguồn đóng góp phù hợp do máy chủ xác nhận.</p>
        {badge.status === 'EARNED' && badge.awardedAt ? <p>Ghi nhận: {formatServerDate(badge.awardedAt)}.</p> : null}
        {badge.status === 'REVOKED' ? (
          <p className={styles.reversalNote}>
            Huy hiệu đã được điều chỉnh{badge.revokedAt ? ` vào ${formatServerDate(badge.revokedAt)}` : ''}. Lịch sử vẫn được giữ lại để minh bạch.
          </p>
        ) : null}
      </div>
    </details>
  );
}

function MilestoneSection({ progress }: { progress: LearningProgress }) {
  return (
    <section className={styles.milestoneSection} aria-labelledby='progress-milestones-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionKicker}>Nhìn lại hành trình</p>
          <h3 id='progress-milestones-title'>Mốc học tập</h3>
        </div>
        <Icon name='calendar-check' size={20} aria-hidden='true' />
      </div>
      {progress.milestones.length > 0 ? (
        <ol className={styles.milestoneList}>
          {progress.milestones.slice(-6).reverse().map((milestone) => (
            <li key={`${milestone.kind}-${milestone.threshold}-${milestone.achievedOn}`}>
              <span>{milestoneLabel(milestone)}</span>
              <time dateTime={milestone.achievedOn}>{milestone.achievedOn}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.inlineEmpty}>Chưa có mốc học tập. Các mốc sẽ được máy chủ ghi nhận sau hoạt động đủ điều kiện.</p>
      )}
    </section>
  );
}

function ProgressLoading() {
  return (
    <section className={styles.progressPanel} aria-labelledby='progress-loading-title' aria-busy='true'>
      <h2 className={styles.screenReaderOnly} id='progress-loading-title'>Đang tải tiến độ học và đóng góp</h2>
      <div className={styles.loadingState} role='status' aria-label='Đang đồng bộ tiến độ từ máy chủ'>
        <span className={styles.loadingWide} />
        <span />
        <span />
        <span className={styles.loadingShort} />
      </div>
    </section>
  );
}

function ProgressError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const unauthorized = error instanceof ApiClientError && error.status === 401;
  const description = unauthorized
    ? 'Phiên đăng nhập đã hết hạn hoặc không còn quyền xem tiến độ riêng tư này.'
    : 'Không thể đồng bộ tiến độ lúc này. Dữ liệu cũ không được tự dựng lại trong trình duyệt.';
  return (
    <section className={`${styles.progressPanel} ${styles.errorPanel}`} aria-labelledby='progress-error-title'>
      <div className={styles.errorState} role='alert'>
        <Icon name={unauthorized ? 'lock' : 'wifi-off'} size={20} aria-hidden='true' />
        <h2 id='progress-error-title'>{unauthorized ? 'Cần đăng nhập lại' : 'Chưa đồng bộ được tiến độ'}</h2>
        <p>{description}</p>
        <div className={styles.errorActions}>
          <Button variant='quiet' onClick={onRetry}>Thử lại</Button>
          {unauthorized ? <Link className={styles.loginLink} to='/login' state={{ from: '/profile' }}>Đăng nhập lại</Link> : null}
        </div>
      </div>
    </section>
  );
}

function formatCount(value: number): string {
  return Number.isSafeInteger(value) ? value.toLocaleString('vi-VN') : '0';
}
