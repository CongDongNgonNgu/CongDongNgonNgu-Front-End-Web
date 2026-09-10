import styles from './RecoveryStatusRail.module.css';

const steps = [
  '1. Yêu cầu',
  '2. Đã gửi',
  '3. Đặt lại mật khẩu',
  '4. Liên kết hết hạn',
  '5. Hoàn tất',
];

interface RecoveryStatusRailProps {
  activeStep: number;
}

export function RecoveryStatusRail({ activeStep }: RecoveryStatusRailProps) {
  return (
    <div className={styles.recoveryRail} aria-label='Trạng thái khôi phục mật khẩu'>
      <div className={styles.recoveryRailHeader}>
        <span>Trạng thái mô phỏng</span>
        <span>Bước {activeStep}/5</span>
      </div>
      <ol className={styles.recoveryTabs}>
        {steps.map((step, index) => (
          <li className={index + 1 === activeStep ? styles.recoveryTabActive : styles.recoveryTab} key={step}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
