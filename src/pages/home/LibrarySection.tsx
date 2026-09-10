import { libraryItems } from './home.constants';
import shared from './HomeShared.module.css';
import styles from './LibrarySection.module.css';

export function LibrarySection() {
  return (
    <section className={`${shared.section} ${styles.librarySection}`} id='library' aria-labelledby='library-title'>
      <div className={styles.libraryHeader}>
        <div><p className={shared.sectionLabel}>Open Language Library</p><h2 id='library-title'>Thư viện ngôn ngữ mở</h2></div>
        <p>Những đóng góp tốt có thể trở thành tri thức dùng lại được, có ngữ cảnh và có người cùng kiểm chứng.</p>
      </div>
      <ul className={styles.libraryList} aria-label='Các chủ đề trong thư viện ngôn ngữ mở'>
        {libraryItems.map((item) => <li key={item.label}><span className={styles.libraryTopic}>{item.label}</span><span className={styles.libraryDescription}>{item.description}</span></li>)}
      </ul>
    </section>
  );
}
