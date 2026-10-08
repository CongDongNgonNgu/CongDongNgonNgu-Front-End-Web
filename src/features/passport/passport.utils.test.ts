import { describe, expect, it } from 'vitest';
import { goalLabel, skillLabel, formatAvailabilityWindow } from './passport.utils';
import type { ProfileSkill } from '../onboarding/onboarding.types';

describe('profile display localization', () => {
  it('preserves unknown member-entered goals and skills exactly in both locales', () => {
    const custom = 'my_custom-goal 日本語';
    for (const locale of ['vi', 'en'] as const) {
      expect(goalLabel(custom, locale)).toBe(custom);
      expect(skillLabel(custom as ProfileSkill, locale)).toBe(custom);
    }
  });
  it('localizes canonical options and weekdays without changing availability values', () => {
    const availability = { dayOfWeek: 2, startTime: '19:00', endTime: '20:00' };
    expect(goalLabel('conversation', 'en')).toBe('Confident conversations');
    expect(skillLabel('speaking', 'en')).toBe('Speaking');
    expect(formatAvailabilityWindow(availability, 'en')).toBe('Tuesday · 19:00–20:00');
    expect(formatAvailabilityWindow(availability, 'vi')).toBe('Thứ ba · 19:00–20:00');
    expect(availability).toEqual({ dayOfWeek: 2, startTime: '19:00', endTime: '20:00' });
  });
});
