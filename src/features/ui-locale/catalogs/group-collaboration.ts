export const viGroupCollaboration = {
  "groups.collaboration.connected": "Đã kết nối",
  "groups.collaboration.connecting": "Đang kết nối…",
  "groups.collaboration.reconnecting": "Đang kết nối lại…",
  "groups.collaboration.offline": "Đang đồng bộ bằng yêu cầu định kỳ",
  "groups.collaboration.unavailable": "Kết nối không khả dụng",
  "groups.collaboration.unread": "{count} văn bản chưa đọc",
  "groups.collaboration.markRead": "Đánh dấu đã đọc",
  "groups.collaboration.refresh": "Đồng bộ văn bản",
  "groups.collaboration.reference": "Chia sẻ tài liệu hoặc bài cộng đồng",
  "groups.collaboration.link": "Liên kết nội dung",
  "groups.collaboration.linkHint":
    "Dán liên kết Thư viện hoặc bài thảo luận/câu hỏi công khai trên trang này.",
  "groups.collaboration.linkInvalid":
    "Dùng liên kết chính xác trên trang này, không có tham số hay đoạn neo.",
  "groups.collaboration.note": "Ghi chú (không bắt buộc khi chia sẻ liên kết)",
  "groups.collaboration.counter": "{count} / 2.000 ký tự Unicode",
  "groups.collaboration.invalid":
    "Nhập văn bản hoặc chia sẻ liên kết hợp lệ; ghi chú tối đa 2.000 ký tự Unicode.",
  "groups.collaboration.full":
    "Nhóm giữ tối đa 20 văn bản; nội dung cũ không tự động bị xóa.",
  "groups.collaboration.retry": "Gửi lại bản nháp",
} as const;
export const enGroupCollaboration: Record<
  keyof typeof viGroupCollaboration,
  string
> = {
  "groups.collaboration.connected": "Connected",
  "groups.collaboration.connecting": "Connecting…",
  "groups.collaboration.reconnecting": "Reconnecting…",
  "groups.collaboration.offline": "Syncing with periodic requests",
  "groups.collaboration.unavailable": "Connection unavailable",
  "groups.collaboration.unread": "{count} unread texts",
  "groups.collaboration.markRead": "Mark as read",
  "groups.collaboration.refresh": "Sync texts",
  "groups.collaboration.reference": "Share a resource or community post",
  "groups.collaboration.link": "Content link",
  "groups.collaboration.linkHint":
    "Paste a Library link or a public discussion/question link from this site.",
  "groups.collaboration.linkInvalid":
    "Use an exact link from this site, without query parameters or a fragment.",
  "groups.collaboration.note": "Note (optional when sharing a link)",
  "groups.collaboration.counter": "{count} / 2,000 Unicode characters",
  "groups.collaboration.invalid":
    "Enter text or share a valid link; notes may contain up to 2,000 Unicode characters.",
  "groups.collaboration.full":
    "Groups retain up to 20 texts; older content is not deleted automatically.",
  "groups.collaboration.retry": "Retry draft",
};
