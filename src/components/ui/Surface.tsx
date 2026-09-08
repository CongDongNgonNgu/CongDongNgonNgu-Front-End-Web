import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return <span className={["badge", `badge--${tone}`, className ?? ""].filter(Boolean).join(" ")}>{children}</span>;
}

interface CardProps {
  children: ReactNode;
  as?: "article" | "section" | "div";
  className?: string;
}

export function Card({ children, as = "article", className }: CardProps) {
  const Component = as;
  return <Component className={["surface-card", className ?? ""].filter(Boolean).join(" ")}>{children}</Component>;
}

interface ListRowProps {
  children: ReactNode;
  className?: string;
}

export function ListRow({ children, className }: ListRowProps) {
  return <div className={["list-row", className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return <span className={`avatar avatar--${size}`} aria-label={name}>{initials || "?"}</span>;
}

interface LanguageIndicatorProps {
  language: string;
  level?: string;
}

export function LanguageIndicator({ language, level }: LanguageIndicatorProps) {
  return (
    <span className="language-indicator">
      <span className="language-indicator__dot" aria-hidden="true" />
      <span>{language}</span>
      {level ? <span className="language-indicator__level">{level}</span> : null}
    </span>
  );
}

interface ChipProps {
  children: ReactNode;
  onRemove?: () => void;
}

export function Chip({ children, onRemove }: ChipProps) {
  return (
    <span className="chip">
      <span>{children}</span>
      {onRemove ? <button type="button" onClick={onRemove} aria-label={`Xóa ${String(children)}`}>×</button> : null}
    </span>
  );
}