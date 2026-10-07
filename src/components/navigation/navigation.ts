import type { IconName } from "../ui/Icon/Icon";
import type { TranslationKey } from '../../features/ui-locale/ui-locale';

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  href?: string;
  labelKey?: TranslationKey;
  shortLabelKey?: TranslationKey;
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
    labelKey: 'navigation.home',
    shortLabelKey: 'navigation.homeShort',
    label: "Khám phá",
    shortLabel: "Trang chủ",
    icon: "compass",
    href: "/",
  },
  {
    id: "exchange",
    labelKey: 'navigation.exchange',
    shortLabelKey: 'navigation.exchangeShort',
    label: "Tìm bạn học",
    shortLabel: "Bạn học",
    icon: "arrow-left-right",
    href: "/exchange",
  },
];

export const additionalNavigation: NavigationItem[] = [
  { id: 'library', label: 'Thư viện', shortLabel: 'Thư viện', labelKey: 'navigation.library', icon: 'book-open', href: '/library' },
  { id: "languages", labelKey: 'navigation.languages', label: "Ngôn ngữ", shortLabel: "Ngôn ngữ", icon: "languages", href: "/languages" },
  { id: "community", labelKey: 'navigation.community', label: "Cộng đồng", shortLabel: "Cộng đồng", icon: "users", href: "/community" },
  { id: "membership", labelKey: 'navigation.membership', label: "Membership", shortLabel: "Membership", icon: "award", href: "/membership" },
  { id: "how-it-works", labelKey: 'navigation.how-it-works', label: "Cách bắt đầu", shortLabel: "Cách bắt đầu", icon: "book-open", href: "/#how-it-works" },
];
