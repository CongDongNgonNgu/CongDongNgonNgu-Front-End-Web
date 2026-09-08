import { Icon, type IconName } from '../components/ui/Icon/Icon';
import styles from './HomePage.module.css';

type Tone = 'orange' | 'cyan' | 'green';

interface LoopStep {
  description: string;
  icon: IconName;
  title: string;
  tone: Tone;
}

const languages = ['Tiếng Việt', 'English', '中文', '日本語', '한국어', 'Français', 'Deutsch', 'Español'];

const loopSteps: LoopStep[] = [
  { icon: 'book-open', title: 'Learn', description: 'Bắt đầu từ một điều bạn muốn hiểu.', tone: 'orange' },
  { icon: 'circle-help', title: 'Ask', description: 'Đặt câu hỏi khi từ ngữ chưa đủ rõ.', tone: 'cyan' },
  { icon: 'message-circle', title: 'Practice', description: 'Thử viết, nói và dùng lại trong ngữ cảnh.', tone: 'green' },
  { icon: 'check-circle', title: 'Correct', description: 'Nhận góp ý có lý do, không chỉ đáp án.', tone: 'orange' },
  { icon: 'share', title: 'Share', description: 'Để lại ví dụ hữu ích cho người đến sau.', tone: 'cyan' },
  { icon: 'users', title: 'Help someone else', description: 'Trả lại một điều bạn vừa học được.', tone: 'green' },
];

const libraryItems = [
  { label: 'Vocabulary', description: 'Từ vựng' },
  { label: 'Sentences', description: 'Mẫu câu' },
  { label: 'Grammar', description: 'Ngữ pháp' },
  { label: 'Corrections', description: 'Sửa lỗi' },
  { label: 'Translations', description: 'Dịch thuật' },
  { label: 'Culture', description: 'Văn hóa' },
  { label: 'Pronunciation', description: 'Phát âm' },
  { label: 'Community resources', description: 'Tài nguyên cộng đồng' },
];

const contributionItems = [
  { icon: 'circle-help' as IconName, title: 'Trả lời câu hỏi', description: 'Một lời giải thích rõ ràng có thể mở đường cho nhiều người học.' },
  { icon: 'check-circle' as IconName, title: 'Sửa câu có ngữ cảnh', description: 'Góp ý để người khác hiểu cả cách dùng, không chỉ cách viết.' },
  { icon: 'arrow-left-right' as IconName, title: 'Chia sẻ bản dịch', description: 'Đặt các cách diễn đạt cạnh nhau để sắc thái không bị mất đi.' },
  { icon: 'message-circle' as IconName, title: 'Ghi chú phát âm', description: 'Thêm một ví dụ nói thật để tri thức dễ quay lại trong thực hành.' },
];

const worldTopics = ['Âm thanh & phát âm', 'Cách nói đời thường', 'Văn hóa & bối cảnh', 'Câu chuyện từ cộng đồng'];

const joinClasses = (...classNames: string[]) => classNames.join(' ');

export function HomePage() {
  return (
    <div className={styles.homePage}>
      <section className={styles.hero} aria-labelledby='page-title'>
        <div className={styles.heroCopy}>
          <h1 id='page-title'>Học ngôn ngữ cùng nhau</h1>
          <p className={styles.lede}>
            Kết nối con người thực sự. Xây dựng môi trường ngôn ngữ thực tế qua việc chia sẻ và học hỏi lẫn nhau.
          </p>
          <div className={styles.heroActions}>
            <a className={joinClasses(styles.buttonLink, styles.buttonPrimary)} href='#how-it-works'>
              Xem cách bắt đầu
            </a>
            <a className={joinClasses(styles.buttonLink, styles.buttonSecondary)} href='#community'>
              Khám phá cộng đồng
            </a>
          </div>
        </div>
        <figure className={styles.heroMedia}>
          <img
            src='/brand/language-community-hero-v2.jpg'
            alt='Cộng đồng đa ngôn ngữ cùng chia sẻ ghi chú học tập'
            width='512'
            height='286'
            loading='eager'
            decoding='async'
          />
          <figcaption>
            Cộng đồng học tập thực tế từ những con người thực tế.
          </figcaption>
        </figure>
      </section>

      <section className={joinClasses(styles.section, styles.languageSection)} id='languages' aria-labelledby='languages-title'>
        <div className={styles.sectionHeader}>
          <h2 id='languages-title'>Bắt đầu từ ngôn ngữ bạn muốn sống cùng.</h2>
          <p>
            Những cộng đồng đầu tiên để bạn học, thực hành và chia sẻ. Danh sách này sẽ mở rộng theo nhu cầu thật của cộng đồng.
          </p>
        </div>
        <div className={styles.languageExplorer}>
          <p className={styles.languageLead}>Một cộng đồng mở luôn bắt đầu bằng việc gọi tên những ngôn ngữ đang hiện diện.</p>
          <ul className={styles.languageList} aria-label='Các ngôn ngữ khởi đầu'>
            {languages.map((language) => (
              <li key={language}>
                <span>{language}</span>
                <span className={styles.languageDot} aria-hidden='true' />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className={joinClasses(styles.section, styles.loopSection)} id='how-it-works' aria-labelledby='loop-title'>
        <div className={styles.sectionHeader}>
          <h2 id='loop-title'>Vòng lặp học tập cộng đồng</h2>
          <p>
            Kiến thức không dừng ở việc nhận câu trả lời. Nó trở nên hữu ích hơn khi được thực hành, kiểm chứng và trao lại.
          </p>
        </div>
        <ol className={styles.loopList} aria-label='Vòng lặp học tập cộng đồng'>
          {loopSteps.map((step) => (
            <li className={styles.loopItem} data-tone={step.tone} key={step.title}>
              <span className={styles.loopIcon} aria-hidden='true'><Icon name={step.icon} size={20} /></span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className={joinClasses(styles.section, styles.exchangeSection)} id='exchange' aria-labelledby='exchange-title'>
        <div className={styles.exchangeVisual} aria-hidden='true'>
          <div className={styles.exchangeVisualTop}>
            <span>Cộng đồng cùng tiến bộ</span>
            <Icon name='arrow-left-right' size={20} />
          </div>
          <div className={styles.exchangePair}>
            <div className={styles.exchangePerson}>
              <span className={styles.exchangeAccent} />
              <div>
                <strong>Người học ngôn ngữ mới</strong>
                <span>tìm cách dùng trong đời sống</span>
              </div>
            </div>
            <div className={styles.exchangeDivider}><Icon name='arrow-left-right' size={18} /></div>
            <div className={styles.exchangePerson}>
              <span className={styles.exchangeAccent} />
              <div>
                <strong>Người chia sẻ kinh nghiệm</strong>
                <span>mở thêm ngữ cảnh và góc nhìn</span>
              </div>
            </div>
          </div>
          <p className={styles.exchangeCaption}>Mỗi người vừa học, vừa góp một điều hữu ích.</p>
        </div>
        <div className={styles.exchangeCopy}>
          <p className={styles.kicker}>Khi cộng đồng sẵn sàng</p>
          <h2 id='exchange-title'>Gặp nhau qua ngôn ngữ.</h2>
          <p>
            Chúng tôi hướng tới những cuộc trao đổi dựa trên sự tò mò, tôn trọng và bối cảnh — nơi mỗi người vừa học, vừa giúp người khác tiến bộ, bất kể cặp ngôn ngữ nào.
          </p>
          <p className={styles.availabilityNote}>
            <Icon name='circle-help' size={18} />
            Tính năng kết nối sẽ mở sau, khi nguyên tắc cộng đồng và cơ chế bảo vệ người dùng đã sẵn sàng.
          </p>
        </div>
      </section>
      <section className={joinClasses(styles.section, styles.aiSection)} id='ai-practice' aria-labelledby='ai-title'>
        <div className={styles.aiIntro}>
          <span className={styles.aiIcon} aria-hidden='true'><Icon name='sparkles' size={24} /></span>
          <div>
            <h2 id='ai-title'>Practice with AI. <span>Learn with people.</span></h2>
            <p>
              AI có thể giúp bạn thử câu, luyện phản xạ và nhìn lại ngữ pháp trước khi mang điều đó vào một cuộc trò chuyện thật.
            </p>
          </div>
        </div>
        <ul className={styles.aiSupportList}>
          <li>
            <h3>Luyện tập trước</h3>
            <p>Thử nhiều cách diễn đạt trong không gian riêng, không sợ sai.</p>
          </li>
          <li>
            <h3>Học trong bối cảnh</h3>
            <p>Đưa câu hỏi trở lại cộng đồng để hiểu sắc thái, văn hóa và cách dùng.</p>
          </li>
        </ul>
      </section>
      <section className={joinClasses(styles.section, styles.librarySection)} id='library' aria-labelledby='library-title'>
        <div className={styles.libraryHeader}>
          <div>
            <p className={styles.sectionLabel}>Open Language Library</p>
            <h2 id='library-title'>Thư viện ngôn ngữ mở</h2>
          </div>
          <p>
            Những đóng góp tốt có thể trở thành tri thức dùng lại được, có ngữ cảnh và có người cùng kiểm chứng.
          </p>
        </div>
        <ul className={styles.libraryList} aria-label='Các chủ đề trong thư viện ngôn ngữ mở'>
          {libraryItems.map((item) => (
            <li key={item.label}>
              <span className={styles.libraryTopic}>{item.label}</span>
              <span className={styles.libraryDescription}>{item.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={joinClasses(styles.section, styles.worldSection)} id='language-world' aria-labelledby='world-title'>
        <div className={styles.worldCopy}>
          <p className={styles.worldLabel}>MỞ RA THẾ GIỚI QUA NGÔN NGỮ</p>
          <h2 id='world-title'>Ngôn ngữ của bạn thuộc về thế giới.</h2>
          <p>
            Mỗi ngôn ngữ mang theo một cách nhìn, ký ức và nhịp sống riêng. Bắt đầu từ ngôn ngữ bạn quan tâm, rồi để cộng đồng mở rộng phần còn lại.
          </p>
        </div>
        <ul className={styles.worldTopics} aria-label='Những góc nhìn của ngôn ngữ'>
          {worldTopics.map((topic) => <li key={topic}>{topic}</li>)}
        </ul>
      </section>
      <section className={joinClasses(styles.section, styles.contributionSection)} id='community' aria-labelledby='contribution-title'>
        <div className={styles.sectionHeader}>
          <h2 id='contribution-title'>Mỗi đóng góp làm tri thức chung tốt hơn.</h2>
          <p>
            Một câu trả lời, một ví dụ hay một ghi chú phát âm đều có thể giúp người học tiếp theo bắt đầu dễ hơn.
          </p>
        </div>
        <ul className={styles.contributionList}>
          {contributionItems.map((item) => (
            <li key={item.title}>
              <Icon name={item.icon} size={20} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={joinClasses(styles.section, styles.membershipSection)} id='membership' aria-labelledby='membership-title'>
        <div>
          <p className={styles.sectionLabel}>Một nguyên tắc trước khi có mô hình thành viên</p>
          <h2 id='membership-title'>Cộng đồng miễn phí trước tiên</h2>
        </div>
        <div className={styles.membershipCopy}>
          <p>
            Giá trị học và chia sẻ cốt lõi cần được mở cho mọi người. Những tính năng AI nâng cao, công cụ cao cấp và tiện ích thành viên có thể được phát triển về sau để hỗ trợ tính bền vững của nền tảng.
          </p>
          <p className={styles.membershipNote}>Không có bảng giá hay lời hứa tính năng nào thay thế cho giá trị cộng đồng.</p>
        </div>
      </section>
      <section className={joinClasses(styles.section, styles.finalCta)} aria-labelledby='final-cta-title'>
        <p className={styles.sectionLabel}>Bắt đầu từ một điều thật nhỏ</p>
        <h2 id='final-cta-title'>Một ngôn ngữ mới bắt đầu từ một cuộc trò chuyện.</h2>
        <p>Chọn một ngôn ngữ, đọc một câu hỏi, hoặc để lại điều bạn biết.</p>
        <div className={styles.finalActions}>
          <a className={joinClasses(styles.buttonLink, styles.buttonPrimary)} href='#languages'>Khám phá ngôn ngữ</a>
          <a className={styles.textLink} href='#community'>Tìm hiểu cách đóng góp</a>
        </div>
      </section>
    </div>
  );
}
