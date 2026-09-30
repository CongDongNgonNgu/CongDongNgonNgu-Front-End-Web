export type AiConversationMode = 'conversation' | 'roleplay';
export type AiConversationStatus = 'ACTIVE' | 'ERROR' | 'STOPPED';

export interface AiRoleplayConfig {
  scenarioId: string;
  context: string;
  learnerRole: string;
  assistantRole: string;
  targetLanguageCode: string;
  proficiency: string;
  objective: string;
  tone: string;
  responseStyle: string;
  constraints: string[];
  safeBoundaries: string[];
  goals: string[];
}

export interface AiConversationTurn {
  id: string;
  role: 'learner' | 'assistant';
  kind: 'response' | 'explanation';
  content: string;
  createdAt: string;
}

export interface AiConversationGoal {
  label: string;
  completed: boolean;
}

export interface AiConversation {
  id: string;
  mode: AiConversationMode;
  status: AiConversationStatus;
  responseLanguageCode: string;
  learnerContext: {
    targetLanguage: { code: string; name: string };
    proficiency: { effective: string };
  };
  roleplay: AiRoleplayConfig | null;
  turns: AiConversationTurn[];
  goals: AiConversationGoal[];
  feedback: { summary: string; preciseScore: null } | null;
  failure: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationRequestClient {
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface AiRoleplayScenario {
  id: string;
  label: string;
  context: string;
  learnerRole: string;
  assistantRole: string;
  objective: string;
  safeBoundaries: string[];
  goals: string[];
}

export const AI_ROLEPLAY_SCENARIOS: AiRoleplayScenario[] = [
  { id: 'airport', label: 'Ở sân bay', context: 'Làm thủ tục và xử lý một thay đổi lịch bay tại sân bay.', learnerRole: 'Hành khách', assistantRole: 'Nhân viên sân bay', objective: 'Hỏi thông tin và xác nhận phương án di chuyển rõ ràng.', safeBoundaries: ['Không yêu cầu thông tin hộ chiếu hoặc thanh toán thật.'], goals: ['Nêu yêu cầu rõ ràng', 'Xác nhận thời gian hoặc địa điểm'] },
  { id: 'restaurant', label: 'Tại nhà hàng', context: 'Gọi món, hỏi thành phần và xử lý một yêu cầu ăn uống.', learnerRole: 'Thực khách', assistantRole: 'Nhân viên phục vụ', objective: 'Gọi món lịch sự và kiểm tra thông tin món ăn.', safeBoundaries: ['Không đưa ra tư vấn y tế hoặc dị ứng thay cho chuyên gia.'], goals: ['Gọi món lịch sự', 'Hỏi một thông tin cụ thể'] },
  { id: 'hotel', label: 'Nhận phòng khách sạn', context: 'Nhận phòng và hỏi về tiện ích trong thời gian lưu trú.', learnerRole: 'Khách lưu trú', assistantRole: 'Nhân viên lễ tân', objective: 'Xác nhận đặt phòng và yêu cầu hỗ trợ phù hợp.', safeBoundaries: ['Không dùng dữ liệu đặt phòng hoặc thẻ thanh toán thật.'], goals: ['Xác nhận thông tin', 'Đề nghị hỗ trợ lịch sự'] },
  { id: 'job-interview', label: 'Phỏng vấn việc làm', context: 'Luyện trả lời các câu hỏi phỏng vấn nghề nghiệp phổ biến.', learnerRole: 'Ứng viên', assistantRole: 'Người phỏng vấn', objective: 'Trình bày kinh nghiệm và mục tiêu một cách mạch lạc.', safeBoundaries: ['Không yêu cầu thông tin nhận dạng hoặc quyết định tuyển dụng thật.'], goals: ['Giới thiệu kinh nghiệm', 'Nêu mục tiêu nghề nghiệp'] },
  { id: 'shopping', label: 'Mua sắm', context: 'Tìm sản phẩm, hỏi giá và so sánh lựa chọn tại cửa hàng.', learnerRole: 'Khách hàng', assistantRole: 'Nhân viên cửa hàng', objective: 'Hỏi lựa chọn và đưa ra quyết định mua sắm giả lập.', safeBoundaries: ['Không xử lý thanh toán hoặc đơn hàng thật.'], goals: ['Hỏi lựa chọn', 'So sánh hai đặc điểm'] },
  { id: 'travel', label: 'Lên kế hoạch du lịch', context: 'Trao đổi về lịch trình, phương tiện và ưu tiên cho một chuyến đi.', learnerRole: 'Người lên kế hoạch', assistantRole: 'Bạn đồng hành', objective: 'Thống nhất một lịch trình giả lập phù hợp với ưu tiên.', safeBoundaries: ['Thông tin chỉ để luyện tập, không thay thế tư vấn du lịch cập nhật.'], goals: ['Nêu ưu tiên', 'Đề xuất phương án'] },
  { id: 'business-meeting', label: 'Cuộc họp công việc', context: 'Trao đổi tiến độ dự án và xác nhận thời hạn bàn giao tài liệu.', learnerRole: 'Người quản lý dự án', assistantRole: 'Đối tác dự án', objective: 'Xác nhận tiến độ, thời hạn và phương án dự phòng.', safeBoundaries: ['Không đưa thông tin doanh nghiệp hoặc tài liệu mật thật vào phiên tập.'], goals: ['Xác nhận thời hạn', 'Đề xuất phương án dự phòng'] },
  { id: 'doctor', label: 'Đặt lịch khám', context: 'Luyện mô tả triệu chứng và đặt câu hỏi khi liên hệ cơ sở y tế.', learnerRole: 'Người cần đặt lịch', assistantRole: 'Nhân viên tiếp nhận', objective: 'Mô tả nhu cầu và xác nhận bước tiếp theo an toàn.', safeBoundaries: ['Không chẩn đoán, kê đơn hoặc thay thế tư vấn y tế chuyên môn.'], goals: ['Mô tả nhu cầu', 'Xác nhận lịch hoặc bước tiếp theo'] },
];
