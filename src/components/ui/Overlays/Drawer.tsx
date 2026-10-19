import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  closeLabel?: string;
  navigationLabel?: string;
}

export function Drawer({ open, title, onClose, children, initialFocusRef, returnFocusRef, closeLabel = 'Đóng menu', navigationLabel = 'Điều hướng' }: DrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        const target = returnFocusRef?.current ?? previousFocusRef.current;
        if (target?.isConnected) target.focus();
      }
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? []);
    (initialFocusRef?.current ?? controls()[0] ?? drawerRef.current)?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = controls();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); drawerRef.current?.focus(); }
      else if (!drawerRef.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.classList.add("drawer-open");
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("drawer-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, initialFocusRef, returnFocusRef]);

  if (!open) return null;

  return (
    <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={drawerRef} tabIndex={-1} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerKicker}>{navigationLabel}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button ref={initialFocusRef as RefObject<HTMLButtonElement>} className={styles.iconButton} type="button" onClick={onClose} aria-label={closeLabel}><Icon name="x" size={20} /></button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
      </aside>
    </div>
  );
}
