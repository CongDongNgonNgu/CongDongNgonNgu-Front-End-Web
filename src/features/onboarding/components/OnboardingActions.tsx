import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
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
  const { t, locale } = useUiLocale();
  return (
    <div className={styles.actionBar}>
      {step === 4 ? (
        <button className={styles.skipButton} type='button' onClick={onSkip}>{t('onboarding.skip.this.step')}</button>
      ) : (
        <span className={styles.actionNote}>{t('onboarding.you.can.edit.this.later')}</span>
      )}
      <div className={styles.actionButtons}>
        <Button variant='quiet' type='button' onClick={onBack} disabled={saving || step === 0}>{t('onboarding.back')}</Button>
        <Button variant='secondary' size='lg' type='submit' loading={saving}>
          {step === 4 ? t('onboarding.finish.setup') : t('onboarding.continue')}
          {' '}
          <Icon name='chevron-down' size={18} className={styles.forwardIcon} />
        </Button>
      </div>
    </div>
  );
}
