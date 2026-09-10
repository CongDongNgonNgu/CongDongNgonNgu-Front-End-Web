import { Icon } from '../../components/ui/Icon/Icon';
import shared from './HomeShared.module.css';
import styles from './AiPracticeSection.module.css';

export function AiPracticeSection() {
  return (
    <section className={`${shared.section} ${styles.aiSection}`} id='ai-practice' aria-labelledby='ai-title'>
      <div className={styles.aiIntro}>
        <span className={styles.aiIcon} aria-hidden='true'><Icon name='sparkles' size={24} /></span>
        <div>
          <h2 id='ai-title'>Practice with AI. <span>Learn with people.</span></h2>
          <p>AI có thể giúp bạn thử câu, luyện phản xạ và nhìn lại ngữ pháp trước khi mang điều đó vào một cuộc trò chuyện thật.</p>
        </div>
      </div>
      <ul className={styles.aiSupportList}>
        <li><h3>Luyện tập trước</h3><p>Thử nhiều cách diễn đạt trong không gian riêng, không sợ sai.</p></li>
        <li><h3>Học trong bối cảnh</h3><p>Đưa câu hỏi trở lại cộng đồng để hiểu sắc thái, văn hóa và cách dùng.</p></li>
      </ul>
    </section>
  );
}
