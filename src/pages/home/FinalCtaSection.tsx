import { Link } from 'react-router-dom';
import shared from './HomeShared.module.css';
import styles from './FinalCtaSection.module.css';

export function FinalCtaSection() {
  return (
    <section className={`${shared.section} ${styles.finalCta}`} aria-labelledby='final-cta-title'>
      <p className={shared.sectionLabel}>Bắt đầu từ một điều thật nhỏ</p>
      <h2 id='final-cta-title'>Một ngôn ngữ mới bắt đầu từ một cuộc trò chuyện.</h2>
      <p className={styles.finalDescription}>Chọn một ngôn ngữ, đọc một câu hỏi, hoặc để lại điều bạn biết.</p>
      <div className={styles.finalActions}>
        <Link className={`${shared.buttonLink} ${shared.buttonPrimary}`} to='/#languages'>Khám phá ngôn ngữ</Link>
        <Link className={shared.textLink} to='/#community'>Tìm hiểu cách đóng góp</Link>
      </div>
    </section>
  );
}
