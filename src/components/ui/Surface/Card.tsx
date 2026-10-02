import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: "article" | "section" | "div";
}

export function Card({ children, as = "article", className, ...props }: CardProps) {
  const Component = as;
  return <Component {...props} className={[styles.card, className ?? ""].filter(Boolean).join(" ")}>{children}</Component>;
}
