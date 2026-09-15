import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from '../pages/CommunityRequestPage.module.css';

interface CommunityRequestPageLayoutProps {
  breadcrumb: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  asideTitle: string;
  asideDescription: string;
  asideItems: string[];
}

export function CommunityRequestPageLayout({
  breadcrumb,
  eyebrow,
  title,
  description,
  children,
  asideTitle,
  asideDescription,
  asideItems,
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

        <aside className={styles.guidanceRail} aria-label={asideTitle}>
          <p className={styles.railEyebrow}>GỢI Ý NHỎ</p>
          <h2>{asideTitle}</h2>
          <p>{asideDescription}</p>
          <ul>
            {asideItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link className={styles.railLink} to='/community'>
            Quay lại bảng tin <span aria-hidden='true'>→</span>
          </Link>
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
