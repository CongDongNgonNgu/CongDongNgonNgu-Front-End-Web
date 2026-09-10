import { languages } from './home.constants';
import shared from './HomeShared.module.css';
import styles from './LanguagesSection.module.css';

export function LanguagesSection() {
  return (
    <section className={shared.section} id='languages' aria-labelledby='languages-title'>
      <div className={shared.sectionHeader}>
        <h2 id='languages-title'>Bắt đầu từ ngôn ngữ bạn muốn sống cùng.</h2>
        <p>Những cộng đồng đầu tiên để bạn học, thực hành và chia sẻ. Danh sách này sẽ mở rộng theo nhu cầu thật của cộng đồng.</p>
      </div>
      <div className={styles.languageExplorer}>
        <p className={styles.languageLead}>Một cộng đồng mở luôn bắt đầu bằng việc gọi tên những ngôn ngữ đang hiện diện.</p>
        <ul className={styles.languageList} aria-label='Các ngôn ngữ khởi đầu'>
          {languages.map((language) => (
            <li key={language}><span>{language}</span><span className={styles.languageDot} aria-hidden='true' /></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
