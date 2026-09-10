import { Icon } from '../../components/ui/Icon/Icon';
import shared from './HomeShared.module.css';
import styles from './ExchangeSection.module.css';

export function ExchangeSection() {
  return (
    <section className={`${shared.section} ${styles.exchangeSection}`} id='exchange' aria-labelledby='exchange-title'>
      <div className={styles.exchangeVisual} aria-hidden='true'>
        <div className={styles.exchangeVisualTop}><span>Cộng đồng cùng tiến bộ</span><Icon name='arrow-left-right' size={20} /></div>
        <div className={styles.exchangePair}>
          <div className={styles.exchangePerson}><span className={styles.exchangeAccent} /><div><strong>Người học ngôn ngữ mới</strong><span>tìm cách dùng trong đời sống</span></div></div>
          <div className={styles.exchangeDivider}><Icon name='arrow-left-right' size={18} /></div>
          <div className={styles.exchangePerson}><span className={styles.exchangeAccent} /><div><strong>Người chia sẻ kinh nghiệm</strong><span>mở thêm ngữ cảnh và góc nhìn</span></div></div>
        </div>
        <p className={styles.exchangeCaption}>Mỗi người vừa học, vừa góp một điều hữu ích.</p>
      </div>
      <div className={styles.exchangeCopy}>
        <p className={shared.kicker}>Khi cộng đồng sẵn sàng</p>
        <h2 id='exchange-title'>Gặp nhau qua ngôn ngữ.</h2>
        <p className={styles.exchangeDescription}>Chúng tôi hướng tới những cuộc trao đổi dựa trên sự tò mò, tôn trọng và bối cảnh — nơi mỗi người vừa học, vừa giúp người khác tiến bộ, bất kể cặp ngôn ngữ nào.</p>
        <p className={styles.availabilityNote}><Icon name='circle-help' size={18} />Tính năng kết nối sẽ mở sau, khi nguyên tắc cộng đồng và cơ chế bảo vệ người dùng đã sẵn sàng.</p>
      </div>
    </section>
  );
}
