import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Badge, Card } from '../../../components/ui/Surface';
import type { EventPublicSummary } from '../event.types';
import { eventStateLabel, eventStateTone, formatEventDate, languageLabel, venueLabel } from '../event.formatters';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: EventPublicSummary;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Card className={styles.card}>
      <Link className={styles.cardLink} to={`/events/${event.id}`} aria-label={`Xem chi tiết ${event.title}`}>
        <div className={styles.header}>
          <div className={styles.badges}>
            <Badge tone={eventStateTone(event.state)}>{eventStateLabel(event.state)}</Badge>
            {event.visibility === 'PRIVATE' ? <Badge tone='warning'>Riêng tư</Badge> : null}
          </div>
          <Icon name='calendar-check' size={20} />
        </div>

        <div className={styles.heading}>
          <p className={styles.language}>{languageLabel(event.languageCode)}{event.level ? ` · ${event.level}` : ''}</p>
          <h3>{event.title}</h3>
          {event.topic ? <p className={styles.topic}>{event.topic}</p> : null}
        </div>

        <dl className={styles.facts}>
          <div>
            <dt><Icon name='calendar-check' size={16} />Thời gian</dt>
            <dd><time dateTime={event.startAt}>{formatEventDate(event.startAt, event.timezone)}</time></dd>
          </div>
          <div>
            <dt><Icon name='globe' size={16} />Múi giờ</dt>
            <dd>Giờ địa phương của sự kiện · {event.timezone}</dd>
          </div>
          <div>
            <dt><Icon name='radio' size={16} />Hình thức</dt>
            <dd>{venueLabel(event.venueType)}</dd>
          </div>
          <div>
            <dt><Icon name='users' size={16} />Sức chứa</dt>
            <dd>Giới hạn {event.capacity} người</dd>
          </div>
        </dl>

        <span className={styles.detailPrompt}>Xem chi tiết <span aria-hidden='true'>→</span></span>
      </Link>
    </Card>
  );
}
