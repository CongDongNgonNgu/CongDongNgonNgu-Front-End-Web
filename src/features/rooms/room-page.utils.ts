import type { SpeakingRoomParticipant, SpeakingRoomQueueItem, SpeakingRoomReportCategory, SpeakingRoomSummary } from './room.types';
import { ApiClientError } from '../../services/api-client';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';
export type AudioState = 'idle' | 'connecting' | 'provider-unavailable' | 'permission-denied' | 'ready';
export type PanelId = 'queue' | 'chat';
export type ParticipantAction = 'promote' | 'demote' | 'mute' | 'unmute' | 'remove' | 'block' | 'report';

export interface Notice {
  tone: 'info' | 'success' | 'danger';
  message: string;
}

export const REPORT_CATEGORIES: Array<{ value: SpeakingRoomReportCategory; label: string }> = [
  { value: 'HARASSMENT', label: 'Quấy rối hoặc công kích' },
  { value: 'SPAM', label: 'Spam hoặc quảng cáo' },
  { value: 'HATE', label: 'Nội dung thù ghét' },
  { value: 'SEXUAL_CONTENT', label: 'Nội dung tình dục' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export function readRoomAccessToken(state: unknown): string | undefined {
  if (!state || typeof state !== 'object' || !('roomAccessToken' in state)) return undefined;
  const value = (state as { roomAccessToken?: unknown }).roomAccessToken;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function getRoomDeviceId(): string {
  try {
    const stored = window.sessionStorage.getItem('cdn-room-device');
    if (stored) return stored;
    const next = createRequestId(0);
    window.sessionStorage.setItem('cdn-room-device', next);
    return next;
  } catch {
    return createRequestId(0);
  }
}

export function createRequestId(sequence: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-8)}${String(sequence).padStart(4, '0')}`.slice(0, 36);
}

export function errorCode(error: unknown): string | null {
  if (error instanceof ApiClientError) return error.code;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export function roomErrorDescription(error: unknown): string {
  const code = errorCode(error);
  if (code === 'ROOM_AUTH_REQUIRED' || code === 'AUTH_SESSION_EXPIRED') return 'Bạn cần đăng nhập lại để tham gia phòng.';
  if (code === 'ROOM_NOT_LIVE') return 'Phòng chưa mở hoặc đã kết thúc. Hãy thử lại khi lịch phòng thay đổi.';
  return 'Phòng có thể đã kết thúc, bị giới hạn truy cập hoặc đang tạm thời không sẵn sàng.';
}

export function roomActionMessage(error: unknown): string {
  const code = errorCode(error);
  const messages: Record<string, string> = {
    ROOM_CAPACITY_REACHED: 'Phòng đã đủ chỗ.',
    ROOM_NOT_LIVE: 'Phòng hiện không nhận thao tác tham gia.',
    ROOM_MEDIA_UNAVAILABLE: 'Nhà cung cấp âm thanh chưa sẵn sàng. Không có audio provider nào được kích hoạt.',
    ROOM_PARTICIPANT_MUTED: 'Micro của bạn đang bị tắt bởi kiểm duyệt phòng.',
    ROOM_JOIN_REQUIRED: 'Hãy tham gia phòng trước khi thực hiện thao tác này.',
    ROOM_QUEUE_STATE_INVALID: 'Yêu cầu đã thay đổi. Hãy tải lại hàng chờ.',
    ROOM_CHAT_RATE_LIMITED: 'Bạn đang gửi quá nhanh. Hãy đợi một chút rồi thử lại.',
    ROOM_MODERATION_FORBIDDEN: 'Bạn không có quyền điều phối thao tác này.',
    ROOM_PARTICIPANT_NOT_FOUND: 'Người tham gia không còn ở trong phòng.',
    ROOM_REQUEST_REUSED: 'Thao tác đã được xử lý trước đó. Trạng thái mới nhất đã được giữ.',
  };
  return (code && messages[code]) || 'Thao tác chưa được máy chủ chấp nhận. Hãy kiểm tra kết nối và thử lại.';
}

export function participantActionMessage(action: ParticipantAction): string {
  const messages: Record<ParticipantAction, string> = {
    promote: 'Đã gửi yêu cầu mời lên phát biểu.',
    demote: 'Đã đưa người tham gia về vai trò người nghe.',
    mute: 'Đã tắt tiếng người tham gia.',
    unmute: 'Đã bỏ trạng thái tắt tiếng.',
    remove: 'Đã mời người tham gia rời phòng.',
    block: 'Đã chặn người tham gia trong phạm vi phòng này.',
    report: 'Đã mở biểu mẫu báo cáo.',
  };
  return messages[action];
}

export function isMicrophonePermissionError(error: unknown): boolean {
  return (error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name))
    || (error !== null && typeof error === 'object' && 'name' in error && ['NotAllowedError', 'PermissionDeniedError'].includes(String((error as { name: unknown }).name)));
}

export function languageLabel(code: string): string {
  const labels: Record<string, string> = { en: 'English', vi: 'Tiếng Việt', ja: '日本語', ko: '한국어', fr: 'Français', es: 'Español' };
  return labels[code.toLowerCase()] ?? code.toUpperCase();
}

export function lifecycleLabel(value: SpeakingRoomSummary['lifecycle']): string {
  const labels: Record<SpeakingRoomSummary['lifecycle'], string> = { LIVE: 'ĐANG LIVE', SCHEDULED: 'ĐÃ LÊN LỊCH', ENDED: 'ĐÃ KẾT THÚC', CANCELLED: 'ĐÃ HỦY' };
  return labels[value];
}

export function roleLabel(value: SpeakingRoomParticipant['role']): string {
  const labels: Record<SpeakingRoomParticipant['role'], string> = { HOST: 'Chủ phòng', MODERATOR: 'Điều phối', SPEAKER: 'Người phát biểu', LISTENER: 'Người nghe' };
  return labels[value];
}

export function queueStateLabel(value: SpeakingRoomQueueItem['state']): string {
  const labels: Record<SpeakingRoomQueueItem['state'], string> = { WAITING: 'Đang chờ', ACCEPTED: 'Đã chấp nhận', DECLINED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
  return labels[value];
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function capitalize(value: string): string { return value.slice(0, 1).toUpperCase() + value.slice(1); }
