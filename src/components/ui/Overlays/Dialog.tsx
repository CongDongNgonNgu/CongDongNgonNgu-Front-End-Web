import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../Button";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  description?: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'composer';
}

export function Dialog({ open, title, onClose, children, labelledBy, description, footer, variant = 'default' }: DialogProps) {
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!returnFocusRef.current) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleTabKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=-1])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleTabKeyDown);
    return () => {
      document.removeEventListener('keydown', handleTabKeyDown);
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={[styles.overlay, variant === 'composer' ? styles.overlayComposer : ''].filter(Boolean).join(' ')} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={[styles.dialog, variant === 'composer' ? styles.dialogComposer : ''].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className={styles.dialogHeader}>
          <div className={styles.dialogHeading}>
            <h2 id={titleId}>{title}</h2>
            {description ? <p className={styles.dialogDescription}>{description}</p> : null}
          </div>
          <Button variant="quiet" size="sm" className={styles.dialogClose} onClick={onClose} aria-label="Đóng hộp thoại"><Icon name="x" size={18} /></Button>
        </div>
        <div className={styles.dialogBody}>{children}</div>
        {footer ? <div className={styles.dialogFooter}>{footer}</div> : null}
      </div>
    </div>
  );
}
