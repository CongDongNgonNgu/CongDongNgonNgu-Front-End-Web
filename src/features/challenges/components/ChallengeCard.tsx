import { Badge, Card } from '../../../components/ui/Surface';
import { Icon } from '../../../components/ui/Icon/Icon';
import type { ChallengePublicSummary } from '../challenge.types';
import { challengeStateLabel, challengeStateTone, challengeTypeLabel, formatDateRange, goalLabel, participantLabel } from '../challenge.formatters';
import styles from './ChallengeCard.module.css';

interface ChallengeCardProps {
  challenge: ChallengePublicSummary;
  selected: boolean;
  onSelect: () => void;
}

export function ChallengeCard({ challenge, selected, onSelect }: ChallengeCardProps) {
  return (
    <Card className={[styles.card, selected ? styles.cardSelected : ''].filter(Boolean).join(' ')}>
      <button
        type='button'
        className={styles.selectButton}
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Xem chi tiết ${challenge.title}`}
      >
        <span className={styles.cardHeader}>
          <span className={styles.badges}>
            <Badge tone={challengeStateTone(challenge.state)}>{challengeStateLabel(challenge.state)}</Badge>
            <span className={styles.language}>{challenge.languageCode.toUpperCase()}</span>
          </span>
          <span className={styles.type}>{challengeTypeLabel(challenge.challengeType)}</span>
        </span>
        <span className={styles.title}>{challenge.title}</span>
        <span className={styles.description}>{challenge.description}</span>
        <span className={styles.facts}>
          <span><Icon name='calendar-check' size={16} />{formatDateRange(challenge.startAt, challenge.endAt, challenge.timezone)}</span>
          <span><Icon name='check-circle' size={16} />Mục tiêu {goalLabel(challenge.goal)}</span>
          <span><Icon name='users' size={16} />{participantLabel(challenge.participantCount)}</span>
        </span>
      </button>
    </Card>
  );
}
