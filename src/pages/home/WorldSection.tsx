import { worldTopics } from './home.constants';
import shared from './HomeShared.module.css';
import styles from './WorldSection.module.css';

export function WorldSection() {
  return (
    <section className={`${shared.section} ${styles.worldSection}`} id='language-world' aria-labelledby='world-title'>
      <div className={styles.worldCopy}>
        <p className={styles.worldLabel}>MỞ RA THẾ GIỚI QUA NGÔN NGỮ</p>
        <h2 id='world-title'>Ngôn ngữ của bạn thuộc về thế giới.</h2>
        <p>Mỗi ngôn ngữ mang theo một cách nhìn, ký ức và nhịp sống riêng. Bắt đầu từ ngôn ngữ bạn quan tâm, rồi để cộng đồng mở rộng phần còn lại.</p>
      </div>
      <ul className={styles.worldTopics} aria-label='Những góc nhìn của ngôn ngữ'>
        {worldTopics.map((topic) => <li key={topic}>{topic}</li>)}
      </ul>
    </section>
  );
}
