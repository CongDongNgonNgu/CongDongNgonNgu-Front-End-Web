import {
  AlertCircle,
  ArrowLeftRight,
  Award,
  Bookmark,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  CalendarCheck,
  ChevronDown,
  CircleHelp,
  Compass,
  Flag,
  Globe2,
  Home,
  Info,
  Inbox,
  Languages,
  Library,
  Lock,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Users,
  WifiOff,
  UserRound,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import styles from "./Icon.module.css";

export type IconName =
  | 'bookmark'
  | 'award'
  | 'calendar-check'
  | 'check'
  | 'flag'
  | 'more-horizontal'
  | 'thumbs-up'
  | 'lock'
  | 'info'
  | "alert-circle"
  | "arrow-left-right"
  | "bell"
  | "book-open"
  | "check-circle"
  | "chevron-down"
  | "circle-help"
  | "compass"
  | "globe"
  | "home"
  | "inbox"
  | "languages"
  | "library"
  | "loader-circle"
  | "menu"
  | "message-circle"
  | "search"
  | "refresh-cw"
  | "share"
  | "shield-check"
  | "sparkles"
  | "user-round"
  | "users"
  | "wifi-off"
  | "x";

const icons: Record<IconName, LucideIcon> = {
  bookmark: Bookmark,
  check: Check,
  flag: Flag,
  'more-horizontal': MoreHorizontal,
  'thumbs-up': ThumbsUp,
  "alert-circle": AlertCircle,
  "arrow-left-right": ArrowLeftRight,
  award: Award,
  bell: Bell,
  "book-open": BookOpen,
  "check-circle": CheckCircle2,
  "calendar-check": CalendarCheck,
  "chevron-down": ChevronDown,
  "circle-help": CircleHelp,
  compass: Compass,
  globe: Globe2,
  home: Home,
  inbox: Inbox,
  languages: Languages,
  library: Library,
  lock: Lock,
  info: Info,
  "loader-circle": LoaderCircle,
  menu: Menu,
  "message-circle": MessageCircle,
  search: Search,
  "refresh-cw": RefreshCw,
  share: Share2,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  "user-round": UserRound,
  users: Users,
  "wifi-off": WifiOff,
  x: X,
};

export type IconSize = 16 | 18 | 20 | 24;

export interface IconProps extends Omit<LucideProps, "size" | "strokeWidth"> {
  name: IconName;
  size?: IconSize;
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  const Component = icons[name];
  return <Component {...props} className={[styles.icon, className ?? ""].filter(Boolean).join(" ")} size={size} strokeWidth={1.8} aria-hidden={props["aria-label"] ? undefined : true} />;
}
