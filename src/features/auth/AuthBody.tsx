import type { ReactNode } from 'react';
import styles from './AuthBody.module.css';

interface AuthBodyProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  asideTitle?: string;
  asideText?: string;
}

export function AuthBody({
  eyebrow,
  title,
  description,
  children,
  asideTitle = 'Một tài khoản, nhiều cuộc gặp',
  asideText = 'Giữ lịch sử học tập và những kết nối ngôn ngữ của bạn trong một không gian riêng tư.',
}: AuthBodyProps) {
  return (
    <section className={styles.authBody} aria-labelledby='auth-title'>
      <div className={styles.authMain}>
        <div className={styles.authCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id='auth-title'>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        {children}
      </div>
      <aside className={styles.visualPanel} aria-label='Không gian cộng đồng ngôn ngữ'>
        <div className={styles.visualGrid} aria-hidden='true'>
          <span className={styles.visualLine} />
          <span className={styles.visualRing} />
          <span className={styles.visualDot} />
          <span className={styles.visualDot} />
          <span className={styles.visualDot} />
        </div>
        <div className={styles.visualCopy}>
          <p className={styles.visualKicker}>CONGDONGNGONNGU.VN / 02</p>
          <h2>{asideTitle}</h2>
          <p>{asideText}</p>
          <div className={styles.languageRail} aria-hidden='true'>
            <span>VI</span><span>EN</span><span>FR</span><span>KO</span><span>JA</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
