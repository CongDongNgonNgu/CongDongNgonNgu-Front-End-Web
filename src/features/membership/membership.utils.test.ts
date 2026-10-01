import { describe, expect, it } from 'vitest';
import {
  formatMembershipAmount,
  formatMembershipDate,
  formatMembershipPeriod,
  membershipStatusLabel,
} from './membership.utils';

describe('membership display helpers', () => {
  it('formats server minor-unit VND values without floating point drift', () => {
    expect(formatMembershipAmount('125000', 'VND')).toContain('125.000');
    expect(formatMembershipAmount('0', 'VND')).toBeNull();
    expect(formatMembershipAmount('12.5', 'VND')).toBeNull();
    expect(formatMembershipAmount('not-an-amount', 'VND')).toBeNull();
  });

  it('formats the server-defined billing period', () => {
    expect(formatMembershipPeriod('MONTH', 1)).toBe('1 tháng');
    expect(formatMembershipPeriod('MONTH', 3)).toBe('3 tháng');
    expect(formatMembershipPeriod('YEAR', 1)).toBe('1 năm');
    expect(formatMembershipPeriod('YEAR', 2)).toBe('2 năm');
    expect(formatMembershipPeriod('MONTH', 0)).toBeNull();
  });

  it('formats authoritative timestamps only for display', () => {
    expect(formatMembershipDate('2026-10-01T12:00:00.000Z')).toMatch(/01|1/);
    expect(formatMembershipDate(null)).toBeNull();
    expect(formatMembershipDate('not-a-date')).toBeNull();
  });

  it('keeps membership status wording explicit', () => {
    expect(membershipStatusLabel('DEFAULT_FREE')).toBe('Free');
    expect(membershipStatusLabel('ACTIVE')).toBe('Đang hoạt động');
    expect(membershipStatusLabel('SCHEDULED')).toBe('Đã lên lịch');
    expect(membershipStatusLabel('EXPIRED')).toBe('Đã hết hạn');
  });
});
