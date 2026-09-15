import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/ui/Icon/Icon';
import styles from '../pages/CommunityRequestPage.module.css';

export interface CommunityGuidanceCard {
  icon: IconName;
  title: string;
  description?: string;
  items?: Array<{ label?: string; text: string }>;
  tone?: 'accent' | 'muted';
  link?: { label: string; to: string };
}

interface CommunityRequestPageLayoutProps {
  breadcrumb: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  guidanceCards: CommunityGuidanceCard[];
}

export function CommunityRequestPageLayout({
  breadcrumb,
  eyebrow,
  title,
  description,
  children,
  guidanceCards,
}: CommunityRequestPageLayoutProps) {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <Link to='/community'>Cộng đồng</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>{breadcrumb}</span>
      </nav>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.heroDescription}>{description}</p>
      </header>

      <div className={styles.contentGrid}>
        <section className={styles.formColumn} aria-labelledby='community-request-form-heading'>
          {children}
        </section>

        <aside className={styles.guidanceRail} aria-label='Hướng dẫn gửi yêu cầu'>
          {guidanceCards.map((card) => (
            <section
              key={card.title}
              className={[
                styles.guidanceCard,
                card.tone === 'accent' ? styles.guidanceCardAccent : '',
                card.tone === 'muted' ? styles.guidanceCardMuted : '',
              ].filter(Boolean).join(' ')}
            >
              <div className={styles.guidanceCardHeading}>
                <Icon name={card.icon} size={20} />
                <h2>{card.title}</h2>
              </div>
              {card.description ? <p className={styles.guidanceCardDescription}>{card.description}</p> : null}
              {card.items?.length ? (
                <ul className={styles.guidanceCardItems}>
                  {card.items.map((item) => (
                    <li key={(item.label ?? '') + item.text}>
                      <Icon name='check-circle' size={16} />
                      <span>{item.label ? <strong>{item.label}</strong> : null}{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {card.link ? (
                <Link className={styles.guidanceCardLink} to={card.link.to}>
                  {card.link.label} <span aria-hidden='true'>→</span>
                </Link>
              ) : null}
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function RequestRedirectingState() {
  return (
    <div className={styles.redirectState} role='status' aria-live='polite'>
      Đang chuyển bạn đến trang đăng nhập…
    </div>
  );
}

export function RequestAccessLoadingState() {
  return (
    <div className={styles.redirectState} role='status' aria-live='polite'>
      Đang kiểm tra phiên đăng nhập…
    </div>
  );
}
