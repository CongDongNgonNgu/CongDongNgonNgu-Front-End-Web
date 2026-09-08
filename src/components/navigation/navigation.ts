export type NavigationAvailability = "available" | "coming-soon";

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  glyph: string;
  availability: NavigationAvailability;
  href?: string;
}

export const headerNavigation: NavigationItem[] = [
  {
    id: "home",
    label: "Khám phá",
    shortLabel: "Trang chủ",
    glyph: "⌂",
    availability: "available",
    href: "/",
  },
  {
    id: "languages",
    label: "Ngôn ngữ",
    shortLabel: "Ngôn ngữ",
    glyph: "文",
    availability: "coming-soon",
  },
  {
    id: "community",
    label: "Cộng đồng",
    shortLabel: "Cộng đồng",
    glyph: "◉",
    availability: "coming-soon",
  },
];

export const additionalNavigation: NavigationItem[] = [
  { id: "exchange", label: "Trao đổi", shortLabel: "Trao đổi", glyph: "↔", availability: "coming-soon" },
  { id: "rooms", label: "Phòng nói", shortLabel: "Phòng nói", glyph: "◌", availability: "coming-soon" },
  { id: "library", label: "Thư viện", shortLabel: "Thư viện", glyph: "▤", availability: "coming-soon" },
  { id: "ai", label: "AI", shortLabel: "AI", glyph: "✦", availability: "coming-soon" },
];

export const mobileNavigation: NavigationItem[] = [
  headerNavigation[0],
  { id: "mobile-community", label: "Cộng đồng", shortLabel: "Cộng đồng", glyph: "◉", availability: "coming-soon" },
  { id: "practice", label: "Luyện tập", shortLabel: "Luyện tập", glyph: "◇", availability: "coming-soon" },
  { id: "mobile-ai", label: "AI", shortLabel: "AI", glyph: "✦", availability: "coming-soon" },
  { id: "account", label: "Cá nhân", shortLabel: "Cá nhân", glyph: "○", availability: "coming-soon" },
];

export const futureLabel = "Sắp có";

export function isNavigationAvailable(item: NavigationItem): item is NavigationItem & { href: string } {
  return item.availability === "available" && Boolean(item.href);
}