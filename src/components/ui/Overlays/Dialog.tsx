import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "../Button";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex=\\-1])',
].join(', ');

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  description?: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'composer';
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function Dialog({ open, title, onClose, children, labelledBy, description, footer, variant = 'default', returnFocusRef }: DialogProps) {
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;
  const descriptionId = description ? `${generatedTitleId}-description` : undefined;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!previousFocusRef.current) {
      previousFocusRef.current = returnFocusRef?.current
        ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialogRef.current)?.focus();
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
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
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
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={[styles.overlay, variant === 'composer' ? styles.overlayComposer : ''].filter(Boolean).join(' ')} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={[styles.dialog, variant === 'composer' ? styles.dialogComposer : ''].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} ref={dialogRef}>
        <div className={styles.dialogHeader}>
          <div className={styles.dialogHeading}>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId} className={styles.dialogDescription}>{description}</p> : null}
          </div>
          <Button variant="quiet" size="sm" className={styles.dialogClose} onClick={onClose} aria-label="Đóng hộp thoại"><Icon name="x" size={18} /></Button>
        </div>
        <div className={styles.dialogBody}>{children}</div>
        {footer ? <div className={styles.dialogFooter}>{footer}</div> : null}
      </div>
    </div>
  );
}
