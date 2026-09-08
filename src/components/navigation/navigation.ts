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
