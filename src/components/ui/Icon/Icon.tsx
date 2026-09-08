import {
  AlertCircle,
  ArrowLeftRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Compass,
  Globe2,
  Home,
  Inbox,
  Languages,
  Library,
  LoaderCircle,
  Menu,
  MessageCircle,
  Search,
  Share2,
  Sparkles,
  Users,
  UserRound,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import styles from "./Icon.module.css";

export type IconName =
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
  | "share"
  | "sparkles"
  | "user-round"
  | "users"
  | "x";

const icons: Record<IconName, LucideIcon> = {
  "alert-circle": AlertCircle,
  "arrow-left-right": ArrowLeftRight,
  bell: Bell,
  "book-open": BookOpen,
  "check-circle": CheckCircle2,
  "chevron-down": ChevronDown,
  "circle-help": CircleHelp,
  compass: Compass,
  globe: Globe2,
  home: Home,
  inbox: Inbox,
  languages: Languages,
  library: Library,
  "loader-circle": LoaderCircle,
  menu: Menu,
  "message-circle": MessageCircle,
  search: Search,
  share: Share2,
  sparkles: Sparkles,
  "user-round": UserRound,
  users: Users,
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
