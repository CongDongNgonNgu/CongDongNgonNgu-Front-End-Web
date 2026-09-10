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
        <p className={styles.membershipNote}>Không có bảng giá hay lời hứa tính năng nào thay thế cho giá trị cộng đồng.</p>
      </div>
    </section>
  );
}
