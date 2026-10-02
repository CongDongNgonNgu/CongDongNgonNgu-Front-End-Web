import { useEffect, useId, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

interface DropdownMenuProps {
  open: boolean;
  label: string;
  onToggle: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export function DropdownMenu({ open, label, onToggle, onClose, children }: DropdownMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId = useId();
  const { pathname, search, hash } = useLocation();
  const locationKey = `${pathname}${search}${hash}`;
  const previousLocationRef = useRef(locationKey);
  const close = onClose ?? onToggle;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !dropdownRef.current?.contains(event.target)) close();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, open]);

  useEffect(() => {
    if (previousLocationRef.current === locationKey) return;
    previousLocationRef.current = locationKey;
    if (open) close();
  }, [close, locationKey, open]);

  return (
    <div ref={dropdownRef} className={styles.dropdown}>
      <button id={triggerId} ref={triggerRef} className={styles.navMenuTrigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={onToggle}>
        <span>{label}</span><Icon name="chevron-down" size={16} />
      </button>
      {open ? <div id={menuId} className={styles.dropdownMenu} role="menu" aria-label={label} aria-labelledby={triggerId} onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('a,button,[role="menuitem"]')) close();
      }}>{children}</div> : null}
    </div>
  );
}
