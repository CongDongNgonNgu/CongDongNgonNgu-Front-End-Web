import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  as?: "article" | "section" | "div";
  className?: string;
}

export function Card({ children, as = "article", className }: CardProps) {
  const Component = as;
  return <Component className={[styles.card, className ?? ""].filter(Boolean).join(" ")}>{children}</Component>;
}
