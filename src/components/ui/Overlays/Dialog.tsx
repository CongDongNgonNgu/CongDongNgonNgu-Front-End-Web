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
}

export function Dialog({ open, title, onClose, children, labelledBy }: DialogProps) {
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className={styles.dialogHeader}>
          <h2 id={titleId}>{title}</h2>
          <Button variant="quiet" size="sm" onClick={onClose} aria-label="Đóng hộp thoại"><Icon name="x" size={18} /></Button>
        </div>
        <div className={styles.dialogBody}>{children}</div>
      </div>
    </div>
  );
}
