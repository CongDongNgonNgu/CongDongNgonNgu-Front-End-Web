import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { Icon } from '../../../components/ui/Icon/Icon';
import { localizedOnboardingOptions } from '../onboarding.constants';
import styles from './OnboardingContextRail.module.css';

interface OnboardingContextRailProps {
  step: number;
}

export function OnboardingContextRail({ step }: OnboardingContextRailProps) {
  const { t, locale } = useUiLocale();
  const { ONBOARDING_STEPS } = localizedOnboardingOptions(locale);
  return (
    <aside className={styles.contextRail} aria-label={t('onboarding.setup.progress')}>
      <nav aria-label={t('onboarding.setup.steps')}>
        <p className={styles.railLabel}>{t('onboarding.your.journey')}</p>
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
                <small>{index === step ? t('onboarding.in.progress') : index < step ? t('onboarding.completed') : t('onboarding.not.started')}</small>
              </span>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.privacyNote}>
        <Icon name='lock' size={18} />
        <div>
          <strong>{t('onboarding.privacy.flexibility')}</strong>
          <p>{t('onboarding.your.choices.are.used.only.to.suggest.topics.and.find.learning.partners.at.a.similar.pace')}</p>
          <small>{t('onboarding.you.can.edit.these.at.any.time')}</small>
        </div>
      </div>
    </aside>
  );
}
