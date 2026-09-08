import type { ReactNode } from "react";
import styles from "./ListRow.module.css";

interface ListRowProps {
  children: ReactNode;
  className?: string;
}

export function ListRow({ children, className }: ListRowProps) {
  return <div className={[styles.listRow, className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}
