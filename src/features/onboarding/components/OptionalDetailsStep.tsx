import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { localizedOnboardingOptions } from '../onboarding.constants';
import type { OnboardingDraft } from '../onboarding.types';
import styles from './OptionalDetailsStep.module.css';

interface OptionalDetailsStepProps {
  draft: OnboardingDraft;
  interestValue: string;
  availabilityDay: number;
  availabilityStart: string;
  availabilityEnd: string;
  onInterestChange: (value: string) => void;
  onAddInterest: () => void;
  onRemoveInterest: (interest: string) => void;
  onTimezoneChange: (timezone: string) => void;
  onAvailabilityDayChange: (day: number) => void;
  onAvailabilityStartChange: (value: string) => void;
  onAvailabilityEndChange: (value: string) => void;
  onAddAvailability: () => void;
  onRemoveAvailability: (index: number) => void;
}

export function OptionalDetailsStep({
  draft,
  interestValue,
  availabilityDay,
  availabilityStart,
  availabilityEnd,
  onInterestChange,
  onAddInterest,
  onRemoveInterest,
  onTimezoneChange,
  onAvailabilityDayChange,
  onAvailabilityStartChange,
  onAvailabilityEndChange,
  onAddAvailability,
  onRemoveAvailability,
}: OptionalDetailsStepProps) {
  const { t, locale } = useUiLocale();
  const { DAYS, TIMEZONES } = localizedOnboardingOptions(locale);
  return (
    <section className={styles.optionalSection} aria-labelledby='optional-section-title'>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionEyebrow}>{t('onboarding.optional')}</p>
        <h2 id='optional-section-title'>{t('onboarding.add.more.if.you.like')}</h2>
        <p>{t('onboarding.you.can.skip.this.section.this.information.helps.us.suggest.conversations.at.suitable.times')}</p>
      </div>

      <div className={styles.optionalBlock}>
        <label className={styles.fieldLabel} htmlFor='interest-input'>{t('onboarding.topics.you.are.interested.in')}</label>
        <div className={styles.inlineInput}>
          <input
            id='interest-input'
            value={interestValue}
            maxLength={64}
            placeholder={t('onboarding.for.example.music.food.books')}
            onChange={(event) => onInterestChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddInterest();
              }
            }}
          />
          <Button variant='quiet' type='button' onClick={onAddInterest}>{t('onboarding.add')}</Button>
        </div>
        <div className={styles.interestList} aria-live='polite'>
          {draft.interests.map((interest) => (
            <span className={styles.interestChip} key={interest}>
              {interest}
              <button type='button' aria-label={t('onboarding.remove.interest', { interest })} onClick={() => onRemoveInterest(interest)}>
                <Icon name='x' size={16} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.optionalBlock}>
        <label className={styles.fieldLabel} htmlFor='timezone-select'>{t('onboarding.your.timezone')}</label>
        <select id='timezone-select' value={draft.timezone} onChange={(event) => onTimezoneChange(event.target.value)}>
          <option value=''>{t('onboarding.not.selected')}</option>
          {TIMEZONES.map((timezone) => <option value={timezone.value} key={timezone.value}>{timezone.label}</option>)}
        </select>
        <p className={styles.fieldHint}>{t('onboarding.we.only.use.your.timezone.to.display.suitable.times')}</p>
      </div>

      <div className={styles.optionalBlock}>
        <div className={styles.fieldLabel}>{t('onboarding.times.when.you.can.chat')}</div>
        <div className={styles.availabilityFields}>
          <select aria-label={t('onboarding.day.of.the.week')} value={availabilityDay} onChange={(event) => onAvailabilityDayChange(Number(event.target.value))}>
            {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
          <input aria-label={t('onboarding.start.time')} type='time' value={availabilityStart} onChange={(event) => onAvailabilityStartChange(event.target.value)} />
          <span aria-hidden='true'>{t('onboarding.to')}</span>
          <input aria-label={t('onboarding.end.time')} type='time' value={availabilityEnd} onChange={(event) => onAvailabilityEndChange(event.target.value)} />
          <Button variant='quiet' type='button' onClick={onAddAvailability}>{t('onboarding.add.time')}</Button>
        </div>
        <ul className={styles.availabilityList}>
          {draft.availability.map((window, index) => (
            <li key={`${window.dayOfWeek}-${window.startTime}-${index}`}>
              <span>{DAYS.find((day) => day.value === window.dayOfWeek)?.label}: {window.startTime}–{window.endTime}</span>
              <button type='button' aria-label={t('onboarding.remove.window', { index: index + 1 })} onClick={() => onRemoveAvailability(index)}>
                <Icon name='x' size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
