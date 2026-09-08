import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    fullWidth ? styles.buttonFull : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-state={loading ? "loading" : disabled ? "disabled" : "default"}
    >
      {loading ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
