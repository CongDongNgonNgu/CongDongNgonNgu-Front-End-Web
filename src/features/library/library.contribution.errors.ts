import { ApiClientError } from '../../services/api-client';

const messages: Record<string, string> = {
  LIBRARY_CONTRIBUTION_SUBMIT_REQUIRED: 'Tài nguyên này cần được gửi qua luồng đóng góp cộng đồng.',
  LIBRARY_CONTRIBUTION_TERMS_STALE: 'Điều khoản đóng góp đã được cập nhật. Vui lòng xem lại trước khi gửi.',
  LIBRARY_CONTRIBUTION_PUBLIC_REQUIRED: 'Đóng góp cộng đồng cần được gửi ở chế độ công khai.',
  LIBRARY_CONTRIBUTION_TYPE_FORBIDDEN: 'Loại tài nguyên này hiện chưa được nhận đóng góp.',
  LIBRARY_CONTRIBUTION_PROVENANCE_FORBIDDEN: 'Nguồn đóng góp chưa đáp ứng điều kiện an toàn.',
  LIBRARY_LICENSE_DISABLED: 'Giấy phép đã chọn không còn hoạt động.',
  LIBRARY_LICENSE_REDISTRIBUTION_REQUIRED: 'Giấy phép cần cho phép tái phân phối công khai.',
  LIBRARY_LICENSE_UNKNOWN: 'Không tìm thấy giấy phép phù hợp. Vui lòng tải lại chính sách.',
  LIBRARY_CONTRIBUTION_CONFLICT: 'Tài nguyên này đã được gửi hoặc không còn là bản nháp.',
  AUTH_UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  AUTH_CSRF_INVALID: 'Phiên biểu mẫu đã hết hạn. Hãy tải lại trang và thử lại.',
};

export function getContributionErrorCode(error: unknown): string | null {
  return error instanceof ApiClientError ? error.code : null;
}

export function getContributionErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return messages[error.code] ?? (error.status >= 500
      ? 'Hệ thống đang bận. Bạn hãy thử lại sau ít phút.'
      : 'Không thể hoàn tất đóng góp lúc này. Bạn hãy kiểm tra lại và thử lại.');
  }
  return 'Không thể hoàn tất đóng góp lúc này. Bạn hãy thử lại sau ít phút.';
}

export function shouldRefreshContributionPolicy(error: unknown): boolean {
  const code = getContributionErrorCode(error);
  return code === 'LIBRARY_CONTRIBUTION_TERMS_STALE'
    || isPermanentLicensePolicyError(error);
}

export function isPermanentLicensePolicyError(error: unknown): boolean {
  const code = getContributionErrorCode(error);
  return code === 'LIBRARY_LICENSE_DISABLED'
    || code === 'LIBRARY_LICENSE_REDISTRIBUTION_REQUIRED'
    || code === 'LIBRARY_LICENSE_UNKNOWN';
}
