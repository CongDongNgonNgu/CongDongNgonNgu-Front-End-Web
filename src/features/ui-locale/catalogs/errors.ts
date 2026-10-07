export const viErrors = {
  'errors.libraryRateLimit': 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
  'errors.libraryUnavailable': 'Không thể tải thư viện lúc này. Vui lòng thử lại sau ít phút.',
  'errors.learningQuota': 'Hạn ngạch hoặc tốc độ sử dụng AI đã đạt giới hạn an toàn. Hãy thử lại sau.',
  'errors.learningOffline': 'Dịch vụ học AI đang tạm ngoại tuyến. Tài nguyên gốc vẫn không thay đổi.',
  'errors.learningIneligible': 'Tài nguyên này không còn đủ điều kiện để tạo bài học.',
  'errors.learningAccess': 'Bạn không có quyền tạo bài học lúc này. Vui lòng kiểm tra phiên đăng nhập.',
  'errors.learningUnavailable': 'Không thể kết nối tới dịch vụ học. Hãy thử lại sau.',
} as const;
export const enErrors: Record<keyof typeof viErrors, string> = {
  'errors.libraryRateLimit': 'Too many requests. Please try again in a few minutes.',
  'errors.libraryUnavailable': 'The Library could not load right now. Please try again in a few minutes.',
  'errors.learningQuota': 'The safe AI usage or rate limit has been reached. Please try again later.',
  'errors.learningOffline': 'AI learning is temporarily offline. The original resource remains unchanged.',
  'errors.learningIneligible': 'This resource is no longer eligible for lesson creation.',
  'errors.learningAccess': 'You cannot create a lesson right now. Please check your sign-in session.',
  'errors.learningUnavailable': 'Could not connect to the learning service. Please try again later.',
};
