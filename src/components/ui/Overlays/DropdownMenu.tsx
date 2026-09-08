import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

interface DropdownMenuProps {
  open: boolean;
  label: string;
  onToggle: () => void;
  children: ReactNode;
}

export function DropdownMenu({ open, label, onToggle, children }: DropdownMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggle();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onToggle]);

  return (
    <div className={styles.dropdown}>
      <button ref={triggerRef} className={styles.navMenuTrigger} type="button" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        <span>{label}</span><Icon name="chevron-down" size={16} />
      </button>
      {open ? <div className={styles.dropdownMenu} role="menu" aria-label={label}>{children}</div> : null}
    </div>
  );
}
