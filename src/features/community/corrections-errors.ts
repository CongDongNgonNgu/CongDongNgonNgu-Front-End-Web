import { ApiClientError } from '../../services/api-client';

type RequestKind = 'correction' | 'question';

export function communityRequestErrorMessage(error: unknown, kind: RequestKind): string {
  const noun = kind === 'correction' ? 'yêu cầu sửa' : 'câu hỏi';
  if (!(error instanceof ApiClientError)) {
    return 'Không thể gửi ' + noun + '. Nội dung vẫn được giữ lại để bạn thử lại.';
  }

  if (error.status === 400) {
    if (error.code.includes('LANGUAGE')) return 'Ngôn ngữ mục tiêu không còn khả dụng. Vui lòng chọn lại.';
    if (error.code.includes('TEXT') || error.code.includes('CONTENT')) {
      return 'Nội dung chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.';
    }
    return 'Thông tin ' + noun + ' chưa hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
  if (error.status === 403) return 'Tài khoản hiện chưa thể gửi nội dung này.';
  if (error.status === 404) return 'Ngôn ngữ hoặc không gian cộng đồng không còn khả dụng.';
  if (error.status === 409) return 'Một ' + noun + ' tương tự vừa được tạo. Vui lòng kiểm tra bảng tin.';
  if (error.status === 429) return 'Bạn đã gửi khá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
  if (error.status >= 500) return 'Hệ thống đang bận. Nội dung vẫn được giữ lại, bạn thử lại sau nhé.';
  return 'Không thể gửi ' + noun + '. Nội dung vẫn được giữ lại để bạn thử lại.';
}
