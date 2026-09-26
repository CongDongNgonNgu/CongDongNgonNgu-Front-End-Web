import { ApiClientError } from '../../../services/api-client';

const messages: Record<string, string> = {
  AUTH_UNAUTHORIZED: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
  LIBRARY_REVIEW_FORBIDDEN: 'Bạn không có quyền truy cập không gian kiểm duyệt này.',
  LIBRARY_SELF_VERIFICATION_DENIED: 'Bạn không thể tự xác minh tài nguyên do chính mình gửi.',
  LIBRARY_REVIEW_CONFLICT: 'Tài nguyên đã được người khác xử lý hoặc trạng thái đã thay đổi.',
  LIBRARY_REVIEW_NOTE_REQUIRED: 'Vui lòng ghi chú lý do từ chối trước khi tiếp tục.',
  LIBRARY_REVIEW_MODERATION_INACTIVE: 'Tài nguyên đang có trạng thái kiểm duyệt không phù hợp để xác minh.',
  LIBRARY_PROVENANCE_REQUIRED: 'Tài nguyên chưa có đủ bằng chứng nguồn gốc để xác minh.',
  LIBRARY_LICENSE_UNKNOWN: 'Không thể xác định giấy phép hiện tại của nguồn.',
  LIBRARY_LICENSE_DISABLED: 'Giấy phép của nguồn không còn hoạt động.',
  LIBRARY_LICENSE_REDISTRIBUTION_REQUIRED: 'Giấy phép hiện tại không cho phép tái phân phối công khai.',
  LIBRARY_SOURCE_INVALID: 'Nguồn hiện không còn hợp lệ. Tài nguyên đã được bảo vệ khỏi hiển thị công khai.',
  LIBRARY_SOURCE_STILL_VALID: 'Nguồn đã hợp lệ trở lại. Không cần đưa tài nguyên về hàng chờ.',
  LIBRARY_RESOURCE_NOT_FOUND: 'Không tìm thấy tài nguyên hoặc tài nguyên không còn khả dụng.',
  LIBRARY_INVALID_CURSOR: 'Trang tiếp theo không còn hợp lệ. Vui lòng tải lại hàng chờ.',
  AUTH_CSRF_INVALID: 'Yêu cầu bảo mật không hợp lệ. Vui lòng thử lại trong phiên hiện tại.',
};

export function getLibraryReviewErrorCode(error: unknown): string | null {
  if (error instanceof ApiClientError) return error.code;
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') return error.code;
  return null;
}

export function getLibraryReviewErrorMessage(error: unknown): string {
  const code = getLibraryReviewErrorCode(error);
  return code && messages[code]
    ? messages[code]
    : 'Không thể hoàn tất thao tác kiểm duyệt lúc này. Vui lòng tải lại và thử lại sau.';
}

export function isReviewConflict(error: unknown): boolean {
  return getLibraryReviewErrorCode(error) === 'LIBRARY_REVIEW_CONFLICT';
}

export function isSourceStillValid(error: unknown): boolean {
  return getLibraryReviewErrorCode(error) === 'LIBRARY_SOURCE_STILL_VALID';
}
