import type { ReactNode } from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return <span className={[styles.badge, styles[`badge--${tone}`], className ?? ""].filter(Boolean).join(" ")}>{children}</span>;
}
