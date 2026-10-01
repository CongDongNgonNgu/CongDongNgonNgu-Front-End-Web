import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon/Icon';
import {
  formatNotificationTime,
  getNotificationGroupLabel,
  getNotificationPresentation,
} from './notification.copy';
import type { NotificationStreamItem } from './notification.types';
import styles from './NotificationFeed.module.css';

interface NotificationFeedProps {
  readonly items: readonly NotificationStreamItem[];
  readonly compact?: boolean;
  readonly onMarkRead: (notificationId: string) => void | Promise<void>;
  readonly emptyMessage?: string;
}

export function NotificationFeed({ items, compact = false, onMarkRead, emptyMessage = 'Không có thông báo trong bộ lọc này.' }: NotificationFeedProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty} role='status'>
        <Icon name='inbox' size={24} />
        <strong>Không có thông báo mới</strong>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const visibleItems = compact ? items.slice(0, 5) : items;
  const groups = groupItems(visibleItems);
  return (
    <div className={[styles.feed, compact ? styles.feedCompact : ''].filter(Boolean).join(' ')} role='list'>
      {groups.map((group) => (
        <section className={styles.group} key={group.label} aria-labelledby={`notification-group-${group.label}`}>
          <h3 className={styles.groupHeading} id={`notification-group-${group.label}`}>{group.label}</h3>
          <div className={styles.groupItems}>
            {group.items.map((item) => <NotificationRow key={item.id} item={item} onMarkRead={onMarkRead} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function NotificationRow({ item, onMarkRead }: { item: NotificationStreamItem; onMarkRead: NotificationFeedProps['onMarkRead'] }) {
  const presentation = getNotificationPresentation(item);
  const content = (
    <div className={styles.rowContent}>
      <div className={styles.rowMeta}>
        <span>{presentation.categoryLabel}</span>
        {!item.read ? <span className={styles.unreadLabel}><span className={styles.unreadDot} aria-hidden='true' />Chưa đọc</span> : <span>Đã đọc</span>}
      </div>
      <strong className={styles.rowTitle}>{presentation.title}</strong>
      <p className={styles.rowDescription}>{presentation.description}</p>
      <div className={styles.rowFooter}>
        <time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time>
        {presentation.targetLabel ? <span>{presentation.targetLabel}</span> : null}
      </div>
    </div>
  );

  return (
    <article className={[styles.row, item.read ? styles.rowRead : styles.rowUnread].join(' ')} role='listitem'>
      {item.target?.path ? (
        <Link className={styles.rowLink} to={item.target.path} onClick={() => { if (!item.read) void onMarkRead(item.id); }}>
          {content}
        </Link>
      ) : content}
      <button
        className={styles.readToggle}
        type='button'
        aria-label={item.read ? 'Thông báo đã đọc' : 'Đánh dấu thông báo đã đọc'}
        disabled={item.read}
        onClick={() => { if (!item.read) void onMarkRead(item.id); }}
      >
        <Icon name={item.read ? 'check-circle' : 'check'} size={18} />
      </button>
    </article>
  );
}

function groupItems(items: readonly NotificationStreamItem[]): Array<{ label: string; items: NotificationStreamItem[] }> {
  const groups: Array<{ label: string; items: NotificationStreamItem[] }> = [];
  items.forEach((item) => {
    const label = getNotificationGroupLabel(item.createdAt);
    const current = groups[groups.length - 1];
    if (!current || current.label !== label) groups.push({ label, items: [item] });
    else current.items.push(item);
  });
  return groups;
}
