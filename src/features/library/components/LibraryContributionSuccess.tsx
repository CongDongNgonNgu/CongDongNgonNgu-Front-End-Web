import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import styles from './LibraryContributionSuccess.module.css';

interface LibraryContributionSuccessProps {
  onContributeAnother: () => void;
}

export function LibraryContributionSuccess({ onContributeAnother }: LibraryContributionSuccessProps) {
  return (
    <section className={styles.success} aria-labelledby='contribution-success-heading' tabIndex={-1}>
      <div className={styles.icon} aria-hidden='true'><Icon name='check' size={24} /></div>
      <p className={styles.kicker}>ĐÃ TIẾP NHẬN</p>
      <h2 id='contribution-success-heading'>Cảm ơn bạn đã đóng góp.</h2>
      <p className={styles.lead}>Tài nguyên đã được gửi vào hàng chờ xem xét cộng đồng.</p>
      <div className={styles.notice}>
        <strong>Chưa được xác minh</strong>
        <p>Đóng góp chưa xuất hiện trong thư viện công khai. Nội dung chỉ được hiển thị sau khi được xem xét, xác minh và vượt qua các điều kiện công khai.</p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.libraryLink} to='/library'>Quay lại thư viện</Link>
        <Button variant='secondary' onClick={onContributeAnother}>Đóng góp thêm</Button>
      </div>
    </section>
  );
}
