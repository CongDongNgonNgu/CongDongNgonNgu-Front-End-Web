import type { IconName } from "../ui/Icon/Icon";

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  href?: string;
}

function normalizePath(pathname: string): string {
  if (pathname.length <= 1) return pathname;
  return pathname.replace(/\/+$/, '');
}

export function isNavigationItemActive(item: NavigationItem, pathname: string, hash = ''): boolean {
  if (!item.href) return false;

  const [hrefPath, hrefHash] = item.href.split('#');
  const targetPath = normalizePath(hrefPath || '/');
  const currentPath = normalizePath(pathname);

  if (hrefHash) return currentPath === targetPath && hash === `#${hrefHash}`;
  if (targetPath === '/') return currentPath === '/';
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export const headerNavigation: NavigationItem[] = [
  {
    id: "home",
    label: "Khám phá",
    shortLabel: "Trang chủ",
    icon: "compass",
    href: "/",
  },
  {
    id: "exchange",
    label: "Tìm bạn học",
    shortLabel: "Bạn học",
    icon: "arrow-left-right",
    href: "/exchange",
  },
];

export const additionalNavigation: NavigationItem[] = [
  { id: "languages", label: "Ngôn ngữ", shortLabel: "Ngôn ngữ", icon: "languages", href: "/languages" },
  { id: "community", label: "Cộng đồng", shortLabel: "Cộng đồng", icon: "users", href: "/community" },
  { id: "membership", label: "Membership", shortLabel: "Membership", icon: "award", href: "/membership" },
  { id: "how-it-works", label: "Cách bắt đầu", shortLabel: "Cách bắt đầu", icon: "book-open", href: "/#how-it-works" },
];
