import { Icon } from '../../../components/ui/Icon/Icon';
import { ONBOARDING_STEPS } from '../onboarding.constants';
import styles from './OnboardingContextRail.module.css';

interface OnboardingContextRailProps {
  step: number;
}

export function OnboardingContextRail({ step }: OnboardingContextRailProps) {
  return (
    <aside className={styles.contextRail} aria-label='Tiến trình thiết lập'>
      <nav aria-label='Các bước thiết lập'>
        <p className={styles.railLabel}>Lộ trình của bạn</p>
        <ol className={styles.roadmap}>
          {ONBOARDING_STEPS.map((item, index) => (
            <li
              className={index === step ? styles.roadmapActive : index < step ? styles.roadmapDone : ''}
              key={item.label}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className={styles.roadmapMarker} aria-hidden='true'>
                {index < step ? <Icon name='check-circle' size={18} /> : index + 1}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{index === step ? 'Đang thực hiện' : index < step ? 'Đã hoàn thành' : 'Chưa thực hiện'}</small>
              </span>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.privacyNote}>
        <Icon name='lock' size={18} />
        <div>
          <strong>Quyền riêng tư & linh hoạt</strong>
          <p>Thông tin bạn chọn chỉ dùng để gợi ý chủ đề và tìm bạn học cùng nhịp độ.</p>
          <small>Bạn có thể chỉnh sửa sau bất kỳ lúc nào.</small>
        </div>
      </div>
    </aside>
  );
}
