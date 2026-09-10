import type { ProfileSkill } from './onboarding.types';

export const ONBOARDING_STEPS = [
  { label: 'Ngôn ngữ bạn nói', eyebrow: 'Thiết lập ngôn ngữ', title: 'Bạn nói ngôn ngữ nào?', description: 'Chào mừng bạn đến với cộng đồng. Hãy cho chúng tôi biết những ngôn ngữ bạn đã quen thuộc để kết nối đúng người học và nội dung phù hợp.' },
  { label: 'Ngôn ngữ muốn học', eyebrow: 'Mục tiêu học tập', title: 'Bạn muốn học ngôn ngữ nào?', description: 'Chọn một hoặc vài ngôn ngữ để chúng tôi gợi ý nội dung và bạn học phù hợp hơn.' },
  { label: 'Trình độ hiện tại', eyebrow: 'Mức độ quen thuộc', title: 'Trình độ hiện tại của bạn?', description: 'Một ước lượng nhanh là đủ. Bạn có thể cập nhật lại sau khi đã học thêm.' },
  { label: 'Mục tiêu & kỹ năng', eyebrow: 'Cách bạn muốn học', title: 'Bạn muốn học như thế nào?', description: 'Chọn điều bạn muốn đạt được và những kỹ năng bạn muốn luyện tập cùng cộng đồng.' },
  { label: 'Lịch học linh hoạt', eyebrow: 'Thông tin thêm', title: 'Thêm một chút về lịch của bạn', description: 'Phần này hoàn toàn tùy chọn. Chia sẻ thêm để việc tìm bạn học cùng nhịp dễ dàng hơn.' },
] as const;

export const GOAL_OPTIONS = [
  { value: 'conversation', label: 'Giao tiếp tự tin', description: 'Trò chuyện tự nhiên hơn' },
  { value: 'travel', label: 'Du lịch', description: 'Thoải mái trong những chuyến đi' },
  { value: 'work', label: 'Công việc', description: 'Mở rộng cơ hội nghề nghiệp' },
  { value: 'reading', label: 'Đọc nội dung', description: 'Hiểu sách, báo và văn hóa' },
  { value: 'community', label: 'Kết bạn', description: 'Gặp gỡ những người cùng học' },
  { value: 'exam', label: 'Thi cử', description: 'Chuẩn bị cho một kỳ thi' },
] as const;

export const SKILL_OPTIONS: Array<{ value: ProfileSkill; label: string }> = [
  { value: 'speaking', label: 'Nói' },
  { value: 'listening', label: 'Nghe' },
  { value: 'reading', label: 'Đọc' },
  { value: 'writing', label: 'Viết' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'vocabulary', label: 'Từ vựng' },
];

export const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (UTC+07:00)' },
  { value: 'Asia/Shanghai', label: 'Trung Quốc (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Nhật Bản (UTC+09:00)' },
  { value: 'Asia/Seoul', label: 'Hàn Quốc (UTC+09:00)' },
  { value: 'Europe/Paris', label: 'Pháp (UTC+01:00)' },
  { value: 'Europe/Berlin', label: 'Đức (UTC+01:00)' },
  { value: 'America/New_York', label: 'Bờ Đông Hoa Kỳ (UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'Bờ Tây Hoa Kỳ (UTC-08:00)' },
];

export const DAYS = [
  { value: 1, label: 'Thứ hai' },
  { value: 2, label: 'Thứ ba' },
  { value: 3, label: 'Thứ tư' },
  { value: 4, label: 'Thứ năm' },
  { value: 5, label: 'Thứ sáu' },
  { value: 6, label: 'Thứ bảy' },
  { value: 7, label: 'Chủ nhật' },
];
