import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
}

export function Drawer({ open, title, onClose, children, initialFocusRef, returnFocusRef }: DrawerProps) {
  const titleId = "drawer-title";
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) returnFocusRef?.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    initialFocusRef?.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerKicker}>Điều hướng</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button ref={initialFocusRef as RefObject<HTMLButtonElement>} className={styles.iconButton} type="button" onClick={onClose} aria-label="Đóng menu"><Icon name="x" size={20} /></button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
      </aside>
    </div>
  );
}
