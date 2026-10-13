import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
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
  const { t } = useUiLocale();
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t("community.posts.breadcrumb")}>
        <Link to='/'>{t("community.posts.home")}</Link>
        <span aria-hidden='true'>/</span>
        <Link to='/community'>{t("community.posts.community")}</Link>
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

        <aside className={styles.guidanceRail} aria-label={t("community.posts.request.guidance")}>
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
  const { t } = useUiLocale();
  return (
    <div className={styles.redirectState} role='status' aria-live='polite'>
      {t("community.posts.redirecting.you.to.sign.in")}</div>
  );
}

export function RequestAccessLoadingState() {
  const { t } = useUiLocale();
  return (
    <div className={styles.redirectState} role='status' aria-live='polite'>
      {t("community.posts.checking.your.session")}</div>
  );
}
