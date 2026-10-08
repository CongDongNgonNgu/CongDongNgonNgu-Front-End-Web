import { translate, type UiLocale } from '../ui-locale/ui-locale';
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

export function localizedOnboardingOptions(locale: UiLocale) {
  const onboarding_stepsKeys = [{"label":"onboarding.languages.you.speak","eyebrow":"onboarding.language.setup","title":"onboarding.which.languages.do.you.speak","description":"onboarding.welcome.to.the.community.tell.us.which.languages.you.already.know.so.we.can.connect.you.with.suitable.learners.and.content"},{"label":"onboarding.learning.languages.step","eyebrow":"onboarding.learning.goals","title":"onboarding.which.languages.do.you.want.to.learn","description":"onboarding.choose.one.or.more.languages.so.we.can.suggest.suitable.content.and.learning.partners"},{"label":"onboarding.current.proficiency","eyebrow":"onboarding.language.familiarity","title":"onboarding.what.is.your.current.proficiency","description":"onboarding.a.quick.estimate.is.enough.you.can.update.it.as.you.learn.more"},{"label":"onboarding.goals.skills","eyebrow":"onboarding.how.you.want.to.learn","title":"onboarding.how.do.you.want.to.learn","description":"onboarding.choose.what.you.want.to.achieve.and.the.skills.you.want.to.practice.with.the.community"},{"label":"onboarding.flexible.learning.schedule","eyebrow":"onboarding.more.information","title":"onboarding.tell.us.a.little.about.your.schedule","description":"onboarding.this.section.is.entirely.optional.share.more.to.make.finding.learning.partners.at.a.similar.pace.easier"}] as const;
  const goal_optionsKeys = [{"label":"onboarding.confident.conversations","description":"onboarding.chat.more.naturally"},{"label":"onboarding.travel","description":"onboarding.feel.comfortable.on.your.trips"},{"label":"onboarding.work","description":"onboarding.expand.your.career.opportunities"},{"label":"onboarding.reading.content","description":"onboarding.understand.books.news.and.culture"},{"label":"onboarding.making.friends","description":"onboarding.meet.other.learners"},{"label":"onboarding.exams","description":"onboarding.prepare.for.an.exam"}] as const;
  const skill_optionsKeys = [{"label":"onboarding.speaking"},{"label":"onboarding.listening"},{"label":"onboarding.reading"},{"label":"onboarding.writing"},{"label":"onboarding.grammar"},{"label":"onboarding.vocabulary"}] as const;
  const timezonesKeys = [{"label":"onboarding.vietnam.utc.offset07.offset00"},{"label":"onboarding.china.utc.offset08.offset00"},{"label":"onboarding.japan.utc.offset09.offset00"},{"label":"onboarding.south.korea.utc.offset09.offset00"},{"label":"onboarding.france.utc.offset01.offset00"},{"label":"onboarding.germany.utc.offset01.offset00"},{"label":"onboarding.us.east.coast.utc.offset05.offset00"},{"label":"onboarding.us.west.coast.utc.offset08.offset00"}] as const;
  const daysKeys = [{"label":"onboarding.monday"},{"label":"onboarding.tuesday"},{"label":"onboarding.wednesday"},{"label":"onboarding.thursday"},{"label":"onboarding.friday"},{"label":"onboarding.saturday"},{"label":"onboarding.sunday"}] as const;
  return {
    ONBOARDING_STEPS: ONBOARDING_STEPS.map((option, index) => ({ ...option, label: translate(locale, onboarding_stepsKeys[index].label), eyebrow: translate(locale, onboarding_stepsKeys[index].eyebrow), title: translate(locale, onboarding_stepsKeys[index].title), description: translate(locale, onboarding_stepsKeys[index].description) })),
    GOAL_OPTIONS: GOAL_OPTIONS.map((option, index) => ({ ...option, label: translate(locale, goal_optionsKeys[index].label), description: translate(locale, goal_optionsKeys[index].description) })),
    SKILL_OPTIONS: SKILL_OPTIONS.map((option, index) => ({ ...option, label: translate(locale, skill_optionsKeys[index].label) })),
    TIMEZONES: TIMEZONES.map((option, index) => ({ ...option, label: translate(locale, timezonesKeys[index].label) })),
    DAYS: DAYS.map((option, index) => ({ ...option, label: translate(locale, daysKeys[index].label) })),
  };
}
