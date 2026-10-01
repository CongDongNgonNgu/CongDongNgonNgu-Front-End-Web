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
  Hand,
  Home,
  Info,
  Inbox,
  Languages,
  Library,
  Lock,
  LogOut,
  LoaderCircle,
  Menu,
  Mic,
  MicOff,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Search,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
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
  | "hand"
  | "home"
  | "inbox"
  | "languages"
  | "library"
  | "loader-circle"
  | "log-out"
  | "menu"
  | "mic"
  | "mic-off"
  | "message-circle"
  | "radio"
  | "search"
  | "refresh-cw"
  | "send"
  | "share"
  | "shield-alert"
  | "shield-check"
  | "sparkles"
  | "user-round"
  | "user-minus"
  | "user-plus"
  | "users"
  | "volume-2"
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
  hand: Hand,
  home: Home,
  inbox: Inbox,
  languages: Languages,
  library: Library,
  lock: Lock,
  "log-out": LogOut,
  info: Info,
  "loader-circle": LoaderCircle,
  menu: Menu,
  mic: Mic,
  "mic-off": MicOff,
  "message-circle": MessageCircle,
  radio: Radio,
  search: Search,
  "refresh-cw": RefreshCw,
  send: Send,
  share: Share2,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  "user-round": UserRound,
  "user-minus": UserMinus,
  "user-plus": UserPlus,
  users: Users,
  "volume-2": Volume2,
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
