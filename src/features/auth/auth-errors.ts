import { ApiClientError } from '../../services/api-client';

const messages: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  AUTH_EMAIL_VERIFICATION_REQUIRED: 'Hãy xác minh email trước khi đăng nhập.',
  AUTH_ACCOUNT_DISABLED: 'Tài khoản đang bị tạm khóa. Vui lòng liên hệ hỗ trợ.',
  AUTH_RATE_LIMITED: 'Bạn thử lại sau ít phút.',
  AUTH_CSRF_INVALID: 'Phiên biểu mẫu đã hết hạn. Hãy tải lại trang và thử lại.',
  AUTH_SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  AUTH_PROVIDER_DISABLED: 'Phương thức này hiện chưa khả dụng.',
  AUTH_PROVIDER_UNAVAILABLE: 'Phương thức này tạm thời chưa khả dụng.',
  AUTH_OAUTH_FAILED: 'Không thể hoàn tất đăng nhập với nhà cung cấp.',
  AUTH_ACCOUNT_COLLISION: 'Email này đã có tài khoản. Hãy đăng nhập rồi liên kết phương thức mới.',
  AUTH_VERIFICATION_INVALID: 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.',
  AUTH_RESET_INVALID: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return messages[error.code] ?? (error.status >= 500
      ? 'Hệ thống đang bận. Bạn thử lại sau nhé.'
      : error.message);
  }
  return 'Có lỗi xảy ra. Bạn thử lại sau nhé.';
}
