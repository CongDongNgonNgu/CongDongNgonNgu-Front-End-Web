export const viCommon = {
  'common.loading': 'Đang tải…',
  'common.unavailable': 'Nội dung chưa khả dụng.',
  'common.retry': 'Thử lại',
  'common.close': 'Đóng',
  'common.uiLanguage': 'Ngôn ngữ giao diện',
  'common.pageLoading': 'Đang tải trang…',
} as const;
export const enCommon: Record<keyof typeof viCommon, string> = {
  'common.loading': 'Loading…',
  'common.unavailable': 'Content is unavailable.',
  'common.retry': 'Try again',
  'common.close': 'Close',
  'common.uiLanguage': 'UI language',
  'common.pageLoading': 'Loading page…',
};
