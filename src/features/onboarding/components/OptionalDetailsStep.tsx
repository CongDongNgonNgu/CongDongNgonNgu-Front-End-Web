import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { DAYS, TIMEZONES } from '../onboarding.constants';
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
  return (
    <section className={styles.optionalSection} aria-labelledby='optional-section-title'>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionEyebrow}>KHÔNG BẮT BUỘC</p>
        <h2 id='optional-section-title'>Chọn thêm nếu bạn muốn</h2>
        <p>Bỏ qua phần này cũng được. Những thông tin này giúp chúng tôi gợi ý cuộc trò chuyện đúng lúc hơn.</p>
      </div>

      <div className={styles.optionalBlock}>
        <label className={styles.fieldLabel} htmlFor='interest-input'>Chủ đề bạn quan tâm</label>
        <div className={styles.inlineInput}>
          <input
            id='interest-input'
            value={interestValue}
            maxLength={64}
            placeholder='Ví dụ: âm nhạc, ẩm thực, sách...'
            onChange={(event) => onInterestChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddInterest();
              }
            }}
          />
          <Button variant='quiet' type='button' onClick={onAddInterest}>Thêm</Button>
        </div>
        <div className={styles.interestList} aria-live='polite'>
          {draft.interests.map((interest) => (
            <span className={styles.interestChip} key={interest}>
              {interest}
              <button type='button' aria-label={`Xóa sở thích ${interest}`} onClick={() => onRemoveInterest(interest)}>
                <Icon name='x' size={16} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.optionalBlock}>
        <label className={styles.fieldLabel} htmlFor='timezone-select'>Múi giờ của bạn</label>
        <select id='timezone-select' value={draft.timezone} onChange={(event) => onTimezoneChange(event.target.value)}>
          <option value=''>Chưa chọn</option>
          {TIMEZONES.map((timezone) => <option value={timezone.value} key={timezone.value}>{timezone.label}</option>)}
        </select>
        <p className={styles.fieldHint}>Chúng tôi chỉ dùng múi giờ để hiển thị thời gian phù hợp.</p>
      </div>

      <div className={styles.optionalBlock}>
        <div className={styles.fieldLabel}>Khung giờ bạn có thể trò chuyện</div>
        <div className={styles.availabilityFields}>
          <select aria-label='Ngày trong tuần' value={availabilityDay} onChange={(event) => onAvailabilityDayChange(Number(event.target.value))}>
            {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
          <input aria-label='Giờ bắt đầu' type='time' value={availabilityStart} onChange={(event) => onAvailabilityStartChange(event.target.value)} />
          <span aria-hidden='true'>đến</span>
          <input aria-label='Giờ kết thúc' type='time' value={availabilityEnd} onChange={(event) => onAvailabilityEndChange(event.target.value)} />
          <Button variant='quiet' type='button' onClick={onAddAvailability}>Thêm giờ</Button>
        </div>
        <ul className={styles.availabilityList}>
          {draft.availability.map((window, index) => (
            <li key={`${window.dayOfWeek}-${window.startTime}-${index}`}>
              <span>{DAYS.find((day) => day.value === window.dayOfWeek)?.label}: {window.startTime}–{window.endTime}</span>
              <button type='button' aria-label={`Xóa khung giờ ${index + 1}`} onClick={() => onRemoveAvailability(index)}>
                <Icon name='x' size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
