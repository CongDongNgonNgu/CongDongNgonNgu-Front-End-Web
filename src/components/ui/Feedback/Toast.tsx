import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Feedback.module.css";

interface ToastProps {
  children: ReactNode;
  tone?: "info" | "success" | "danger";
  onClose?: () => void;
}

export function Toast({ children, tone = "info", onClose }: ToastProps) {
  return (
    <div className={[styles.toast, styles[`toast--${tone}`]].join(" ")} role="status" aria-live="polite">
      <span>{children}</span>
      {onClose ? <button className={styles.toastClose} type="button" onClick={onClose} aria-label="Đóng thông báo"><Icon name="x" size={16} /></button> : null}
    </div>
  );
}
