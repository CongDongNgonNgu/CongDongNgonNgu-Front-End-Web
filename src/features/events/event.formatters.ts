import type {
  EventPublicState,
  EventRegistrationStatus,
  EventVenueType,
} from './event.types';

export function eventStateLabel(state: EventPublicState): string {
  switch (state) {
    case 'UPCOMING': return 'Sắp diễn ra';
    case 'LIVE': return 'Đang diễn ra';
    case 'ENDED': return 'Đã kết thúc';
    case 'CANCELLED': return 'Đã hủy';
  }
}

export function eventStateTone(state: EventPublicState): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (state) {
    case 'UPCOMING': return 'info';
    case 'LIVE': return 'success';
    case 'ENDED': return 'neutral';
    case 'CANCELLED': return 'danger';
  }
}

export function registrationStateLabel(status: EventRegistrationStatus): string {
  switch (status) {
    case 'REGISTERED': return 'Đã đăng ký';
    case 'WAITLISTED': return 'Đang ở danh sách chờ';
    case 'CANCELLED': return 'Đã hủy đăng ký';
  }
}

export function venueLabel(venueType: EventVenueType): string {
  switch (venueType) {
    case 'SPEAKING_ROOM': return 'Phòng nói';
    case 'EXTERNAL': return 'Trực tuyến bên ngoài';
    case 'PHYSICAL': return 'Địa điểm trực tiếp';
  }
}

export function languageLabel(languageCode: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    ja: '日本語',
    ko: '한국어',
    vi: 'Tiếng Việt',
    zh: '中文',
  };
  return labels[languageCode.toLowerCase()] ?? languageCode.toUpperCase();
}

export function formatEventDate(value: string, timezone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Thời gian chưa xác định';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

export function formatEventSchedule(startAt: string, endAt: string, timezone: string): string {
  return `${formatEventDate(startAt, timezone)} – ${formatEventDate(endAt, timezone)}`;
}
