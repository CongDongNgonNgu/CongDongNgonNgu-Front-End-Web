import type { MouseEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import styles from './OnboardingActions.module.css';

interface OnboardingActionsProps {
  step: number;
  saving: boolean;
  onBack: () => void;
  onSkip: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function OnboardingActions({ step, saving, onBack, onSkip }: OnboardingActionsProps) {
  return (
    <div className={styles.actionBar}>
      {step === 4 ? (
        <button className={styles.skipButton} type='button' onClick={onSkip}>Bỏ qua bước này</button>
      ) : (
        <span className={styles.actionNote}>Bạn có thể chỉnh sửa sau</span>
      )}
      <div className={styles.actionButtons}>
        <Button variant='quiet' type='button' onClick={onBack} disabled={saving || step === 0}>Quay lại</Button>
        <Button variant='secondary' size='lg' type='submit' loading={saving}>
          {step === 4 ? 'Hoàn tất thiết lập' : 'Tiếp tục'}
          {' '}
          <Icon name='chevron-down' size={18} className={styles.forwardIcon} />
        </Button>
      </div>
    </div>
  );
}
