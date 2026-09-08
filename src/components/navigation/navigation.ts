import type { IconName } from "../ui/Icon/Icon";

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  href?: string;
}

export const headerNavigation: NavigationItem[] = [
  {
    id: "home",
    label: "Khám phá",
    shortLabel: "Trang chủ",
    icon: "compass",
    href: "/",
  },
];

export const additionalNavigation: NavigationItem[] = [
  { id: "languages", label: "Ngôn ngữ", shortLabel: "Ngôn ngữ", icon: "languages", href: "#languages" },
  { id: "community", label: "Cộng đồng", shortLabel: "Cộng đồng", icon: "users", href: "#community" },
  { id: "how-it-works", label: "Cách bắt đầu", shortLabel: "Cách bắt đầu", icon: "book-open", href: "#how-it-works" },
];

export const mobileDrawerNavigation: NavigationItem[] = [
  { id: "exchange", label: "Trao đổi", shortLabel: "Trao đổi", icon: "arrow-left-right", href: "#exchange" },
  { id: "ai-practice", label: "Luyện tập với AI", shortLabel: "AI Practice", icon: "sparkles", href: "#ai-practice" },
  { id: "library", label: "Thư viện mở", shortLabel: "Thư viện", icon: "book-open", href: "#library" },
  { id: "languages", label: "Ngôn ngữ", shortLabel: "Ngôn ngữ", icon: "languages", href: "#languages" },
];
