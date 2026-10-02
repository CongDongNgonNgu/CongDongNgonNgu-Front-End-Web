import { describe, expect, it } from 'vitest';
import { eventStateLabel, formatEventDate, formatEventSchedule, languageLabel, venueLabel } from './event.formatters';

describe('event formatters', () => {
  it('keeps backend state and venue labels understandable', () => {
    expect(eventStateLabel('CANCELLED')).toBe('Đã hủy');
    expect(venueLabel('SPEAKING_ROOM')).toBe('Phòng nói');
    expect(languageLabel('vi')).toBe('Tiếng Việt');
  });

  it('formats participant-facing date/time in the event timezone', () => {
    const date = formatEventDate('2026-10-03T13:00:00.000Z', 'Asia/Ho_Chi_Minh');
    const schedule = formatEventSchedule('2026-10-03T13:00:00.000Z', '2026-10-03T14:00:00.000Z', 'Asia/Ho_Chi_Minh');

    expect(date).toMatch(/20:00/);
    expect(schedule).toContain('–');
    expect(schedule).toContain('21:00');
  });
});
