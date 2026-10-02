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

  it('follows IANA DST transitions instead of applying a fixed offset', () => {
    expect(formatEventDate('2026-03-08T06:30:00.000Z', 'America/New_York')).toMatch(/01:30/);
    expect(formatEventDate('2026-03-08T07:30:00.000Z', 'America/New_York')).toMatch(/03:30/);
    expect(formatEventDate('2026-11-01T04:30:00.000Z', 'America/New_York')).toMatch(/00:30/);
    expect(formatEventDate('2026-11-01T05:30:00.000Z', 'America/New_York')).toMatch(/01:30/);
  });
});
