import { Link } from 'react-router-dom';
import shared from './HomeShared.module.css';
import styles from './MembershipSection.module.css';

export function MembershipSection() {
  return (
    <section className={`${shared.section} ${styles.membershipSection}`} id='membership' aria-labelledby='membership-title'>
      <div>
        <p className={shared.sectionLabel}>Một nguyên tắc trước khi có mô hình thành viên</p>
        <h2 id='membership-title'>Cộng đồng miễn phí trước tiên</h2>
      </div>
      <div className={styles.membershipCopy}>
        <p>Giá trị học và chia sẻ cốt lõi cần được mở cho mọi người. Những tính năng AI nâng cao, công cụ cao cấp và tiện ích thành viên có thể được phát triển về sau để hỗ trợ tính bền vững của nền tảng.</p>
        <p className={styles.membershipNote}>Free luôn có giá trị riêng. Xem bảng quyền lợi và giá hiện hành khi bạn cần thêm lựa chọn.</p>
        <Link className={styles.membershipLink} to='/membership'>Xem bảng membership <span aria-hidden='true'>→</span></Link>
      </div>
    </section>
  );
}
