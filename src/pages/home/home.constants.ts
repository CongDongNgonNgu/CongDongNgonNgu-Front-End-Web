import type { IconName } from '../../components/ui/Icon/Icon';

export type Tone = 'orange' | 'cyan' | 'green';

export interface LoopStep {
  description: string;
  icon: IconName;
  title: string;
  tone: Tone;
}

export const languages = ['Tiếng Việt', 'English', '中文', '日本語', '한국어', 'Français', 'Deutsch', 'Español'];

export const loopSteps: LoopStep[] = [
  { icon: 'book-open', title: 'Learn', description: 'Bắt đầu từ một điều bạn muốn hiểu.', tone: 'orange' },
  { icon: 'circle-help', title: 'Ask', description: 'Đặt câu hỏi khi từ ngữ chưa đủ rõ.', tone: 'cyan' },
  { icon: 'message-circle', title: 'Practice', description: 'Thử viết, nói và dùng lại trong ngữ cảnh.', tone: 'green' },
  { icon: 'check-circle', title: 'Correct', description: 'Nhận góp ý có lý do, không chỉ đáp án.', tone: 'orange' },
  { icon: 'share', title: 'Share', description: 'Để lại ví dụ hữu ích cho người đến sau.', tone: 'cyan' },
  { icon: 'users', title: 'Help someone else', description: 'Trả lại một điều bạn vừa học được.', tone: 'green' },
];

export const libraryItems = [
  { label: 'Vocabulary', description: 'Từ vựng' },
  { label: 'Sentences', description: 'Mẫu câu' },
  { label: 'Grammar', description: 'Ngữ pháp' },
  { label: 'Corrections', description: 'Sửa lỗi' },
  { label: 'Translations', description: 'Dịch thuật' },
  { label: 'Culture', description: 'Văn hóa' },
  { label: 'Pronunciation', description: 'Phát âm' },
  { label: 'Community resources', description: 'Tài nguyên cộng đồng' },
];

export const contributionItems = [
  { icon: 'circle-help' as IconName, title: 'Trả lời câu hỏi', description: 'Một lời giải thích rõ ràng có thể mở đường cho nhiều người học.' },
  { icon: 'check-circle' as IconName, title: 'Sửa câu có ngữ cảnh', description: 'Góp ý để người khác hiểu cả cách dùng, không chỉ cách viết.' },
  { icon: 'arrow-left-right' as IconName, title: 'Chia sẻ bản dịch', description: 'Đặt các cách diễn đạt cạnh nhau để sắc thái không bị mất đi.' },
  { icon: 'message-circle' as IconName, title: 'Ghi chú phát âm', description: 'Thêm một ví dụ nói thật để tri thức dễ quay lại trong thực hành.' },
];

export const worldTopics = ['Âm thanh & phát âm', 'Cách nói đời thường', 'Văn hóa & bối cảnh', 'Câu chuyện từ cộng đồng'];

export const heroImageAlt = 'Cộng đồng đa ngôn ngữ cùng chia sẻ ghi chú học tập';
