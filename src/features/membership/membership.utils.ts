import type { MembershipProjectionStatus } from './membership.types';

export function formatMembershipAmount(amountMinor: string, currency: 'VND'): string | null {
  if (!/^\d+$/u.test(amountMinor)) return null;
  try {
    const amount = BigInt(amountMinor);
    if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return null;
  }
}

export function formatMembershipPeriod(unit: 'MONTH' | 'YEAR', count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 1) return null;
  return `${count} ${unit === 'YEAR' ? 'năm' : 'tháng'}`;
}

export function formatMembershipDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

export function membershipStatusLabel(status: MembershipProjectionStatus): string {
  switch (status) {
    case 'ACTIVE': return 'Đang hoạt động';
    case 'SCHEDULED': return 'Đã lên lịch';
    case 'EXPIRED': return 'Đã hết hạn';
    case 'CANCELLED': return 'Đã hủy';
    case 'REVOKED': return 'Đã thu hồi';
    case 'DEFAULT_FREE': return 'Free';
  }
}
