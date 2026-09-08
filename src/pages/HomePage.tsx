import { Icon, type IconName } from "../components/ui/Icon/Icon";
import styles from "./HomePage.module.css";

const waysToBegin: Array<{ icon: IconName; title: string; description: string }> = [
  { icon: "message-circle", title: "Lắng nghe", description: "Để một giọng nói mới dẫn bạn đến một góc nhìn khác." },
  { icon: "book-open", title: "Thử một câu", description: "Bắt đầu nhỏ, nói thật, và để sự tò mò làm phần còn lại." },
  { icon: "users", title: "Chia sẻ lại", description: "Mang điều bạn học được vào một cuộc trò chuyện khác." },
];

const languageList = ["Tiếng Việt", "English", "中文", "日本語", "한국어", "Español"];

export function HomePage() {
  return (
    <div className={styles.homePage}>
      <section className={styles.hero} aria-labelledby="page-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Cộng đồng ngôn ngữ</p>
          <h1 id="page-title">Học ngôn ngữ cùng nhau.</h1>
          <p className={styles.lede}>Một nơi để học hỏi, thực hành và chia sẻ ngôn ngữ với sự tò mò và tôn trọng.</p>
          <div className={styles.heroActions}>
            <a className={`${styles.buttonLink} ${styles.buttonPrimary}`} href="#how-it-works">Xem cách bắt đầu <Icon name="arrow-left-right" size={18} /></a>
            <a className={styles.textLink} href="#languages">Khám phá ngôn ngữ</a>
          </div>
        </div>
        <figure className={styles.heroMedia}>
          <img src="/brand/language-community-hero-v1.jpg" alt="Bốn người cùng chia sẻ ghi chú học ngôn ngữ" width="1200" height="800" loading="eager" decoding="async" />
          <figcaption><span>Cùng học qua những cuộc trò chuyện</span><Icon name="globe" size={18} /></figcaption>
        </figure>
      </section>

      <section className={`${styles.section} ${styles.stepsSection}`} id="how-it-works" aria-labelledby="how-it-works-title">
        <div className={styles.sectionIntro}>
          <h2 id="how-it-works-title">Mỗi cuộc trò chuyện bắt đầu từ sự tò mò.</h2>
          <p>Không cần chờ đến khi hoàn hảo. Một câu hỏi chân thành cũng đủ mở ra một cách học mới.</p>
        </div>
        <ol className={styles.stepsList}>
          {waysToBegin.map((item, index) => (
            <li key={item.title} className={styles.step}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.stepContent}>
                <Icon name={item.icon} size={20} />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.languagesSection}`} id="languages" aria-labelledby="languages-title">
        <div className={styles.sectionIntro}>
          <h2 id="languages-title">Ngôn ngữ lớn lên qua nhiều giọng nói.</h2>
          <p>Mỗi ngôn ngữ có chỗ cho người mới bắt đầu, người đang luyện tập, và người muốn chia sẻ điều mình biết.</p>
        </div>
        <div className={styles.languagesLayout}>
          <p className={styles.languageNote}>Một cộng đồng mở luôn bắt đầu bằng việc gọi tên những ngôn ngữ đang hiện diện.</p>
          <ul className={styles.languageList} aria-label="Các ngôn ngữ khởi đầu">
            {languageList.map((language) => <li key={language}>{language}</li>)}
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.communitySection}`} id="community" aria-labelledby="community-title">
        <div className={styles.communityInner}>
          <div>
            <p className={styles.eyebrow}>Cùng tạo nên không gian này</p>
            <h2 id="community-title">Khác biệt là điểm bắt đầu, không phải rào cản.</h2>
          </div>
          <p>Chúng ta học tốt hơn khi có thể đặt câu hỏi, lắng nghe câu trả lời, và dành chỗ cho cách diễn đạt của nhau.</p>
        </div>
      </section>
    </div>
  );
}
