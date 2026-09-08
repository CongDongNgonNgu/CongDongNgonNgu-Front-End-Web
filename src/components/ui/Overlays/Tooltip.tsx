import type { ReactNode } from "react";
import styles from "./Overlays.module.css";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  return <span className={styles.tooltip} title={label} aria-label={label}>{children}</span>;
}
