import type { NotificationStreamItem } from './notification.types';

const CATEGORY_LABELS: Record<string, string> = {
  COMMUNITY: 'Cộng đồng',
  CORRECTIONS: 'Hiệu đính',
  EXCHANGE: 'Kết nối',
  REPUTATION: 'Uy tín học thuật',
  MEMBERSHIP: 'Tài khoản & Membership',
  SECURITY: 'Bảo mật',
  MODERATION: 'Kiểm duyệt',
  SYSTEM: 'Hệ thống',
};

const TARGET_LABELS: Record<string, string> = {
  COMMUNITY_POST: 'bài viết cộng đồng',
  COMMUNITY_COMMENT: 'bình luận cộng đồng',
  CORRECTION_RESPONSE: 'góp ý hiệu đính',
  EXCHANGE_CONNECTION: 'kết nối học tập',
  REPUTATION_MILESTONE: 'cột mốc uy tín',
  MEMBERSHIP_SUBSCRIPTION: 'trạng thái Membership',
  SYSTEM: 'thông báo hệ thống',
};

export interface NotificationPresentation {
  readonly categoryLabel: string;
  readonly actorLabel: string;
  readonly title: string;
  readonly description: string;
  readonly targetLabel: string | null;
}

export function getNotificationPresentation(item: NotificationStreamItem): NotificationPresentation {
  const actor = getActorLabel(item);
  const subject = getSafeVariable(item, ['subject', 'title', 'label', 'name']);
  const subjectSuffix = subject ? ` Chủ đề: “${subject}”.` : '';
  const targetLabel = item.target ? TARGET_LABELS[item.target.kind] ?? 'nội dung được liên kết' : null;

  switch (item.notificationType) {
    case 'COMMENT_REPLY':
      return presentation(item, actor, 'Có phản hồi mới', `${actor} đã phản hồi trong ${targetLabel ?? 'cuộc trao đổi'} của bạn.${subjectSuffix}`, targetLabel);
    case 'CORRECTION_ACCEPTED':
      return presentation(item, actor, 'Góp ý hiệu đính đã được chấp thuận', `${actor} đã chấp thuận một góp ý hiệu đính.${subjectSuffix}`, targetLabel);
    case 'ANSWER_ACCEPTED':
      return presentation(item, actor, 'Câu trả lời được chấp nhận', `${actor} đã chọn câu trả lời của bạn làm giải đáp hữu ích.${subjectSuffix}`, targetLabel);
    case 'BUDDY_REQUEST':
      return presentation(item, actor, 'Có yêu cầu kết nối học tập', `${actor} gửi một yêu cầu kết nối học tập.${subjectSuffix}`, targetLabel);
    case 'ROOM_INVITE':
      return presentation(item, actor, 'Bạn được mời vào phòng học', `${actor} mời bạn tham gia một phòng thảo luận.${subjectSuffix}`, targetLabel);
    case 'REPUTATION_MILESTONE':
      return presentation(item, actor, 'Bạn vừa đạt một cột mốc uy tín', `${actor} ghi nhận tiến bộ học thuật của bạn.${subjectSuffix}`, targetLabel);
    case 'MEMBERSHIP_STATE':
      return presentation(item, actor, 'Trạng thái Membership đã cập nhật', `${actor} đã cập nhật trạng thái quyền lợi của bạn.${subjectSuffix}`, targetLabel);
    case 'PAYMENT_STATE':
      return presentation(item, actor, 'Trạng thái thanh toán đã cập nhật', `${actor} đã cập nhật trạng thái thanh toán của bạn.${subjectSuffix}`, targetLabel);
    case 'MODERATION_NOTICE':
      return presentation(item, actor, 'Có thông báo kiểm duyệt', `${actor} gửi một cập nhật an toàn về nội dung của bạn.${subjectSuffix}`, targetLabel);
    case 'SECURITY_NOTICE':
      return presentation(item, actor, 'Thông báo bảo mật', `${actor} gửi một thông báo bảo mật quan trọng.${subjectSuffix}`, targetLabel);
    default:
      return presentation(item, actor, 'Thông báo mới', `${actor} gửi một cập nhật mới.${subjectSuffix}`, targetLabel);
  }
}

export function getNotificationCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? 'Thông báo';
}

export function getNotificationActorLabel(item: NotificationStreamItem): string {
  return getActorLabel(item);
}

export function getNotificationGroupLabel(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt);
  const sameDay = created.toLocaleDateString('vi-VN') === now.toLocaleDateString('vi-VN');
  return sameDay ? 'Hôm nay' : 'Trước đó';
}

export function formatNotificationTime(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt);
  const minutes = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 60_000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60 && created.toLocaleDateString('vi-VN') === now.toLocaleDateString('vi-VN')) {
    return created.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  return created.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function presentation(
  item: NotificationStreamItem,
  actorLabel: string,
  title: string,
  description: string,
  targetLabel: string | null,
): NotificationPresentation {
  return {
    categoryLabel: getNotificationCategoryLabel(item.category),
    actorLabel,
    title,
    description,
    targetLabel,
  };
}

function getActorLabel(item: NotificationStreamItem): string {
  if (item.actor.kind === 'USER') return item.actor.displayName;
  return item.actor.label === 'Deleted member' ? 'Thành viên đã ẩn' : item.actor.label === 'Service' ? 'Dịch vụ hệ thống' : 'Hệ thống';
}

function getSafeVariable(item: NotificationStreamItem, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = item.variables[key];
    if (typeof value !== 'string' || value.length === 0 || value.length > 120) continue;
    if (/[\u0000-\u001F\u007F]/u.test(value)) continue;
    if (/(?:password|secret|token|credential|authorization|cookie|webhook|raw|stack|trace|payment|amount|reference)/iu.test(key)) continue;
    return value;
  }
  return null;
}
