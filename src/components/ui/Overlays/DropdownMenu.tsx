import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "../Icon/Icon";
import styles from "./Overlays.module.css";

interface DropdownMenuProps {
  open: boolean;
  label: string;
  triggerContent?: ReactNode;
  triggerClassName?: string;
  variant?: "menu" | "navigation";
  onToggle: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export function DropdownMenu({ open, label, triggerContent, triggerClassName, variant = "menu", onToggle, onClose, children }: DropdownMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<'first' | 'last' | null>(null);
  const triggerId = useId();
  const menuId = useId();
  const { pathname, search, hash } = useLocation();
  const locationKey = `${pathname}${search}${hash}`;
  const previousLocationRef = useRef(locationKey);
  const close = onClose ?? onToggle;

  const focusItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [role="menuitem"]') ?? []);
  useEffect(() => {
    if (!open || !pendingFocusRef.current) return;
    const items = focusItems();
    (pendingFocusRef.current === 'last' ? items[items.length - 1] : items[0])?.focus();
    pendingFocusRef.current = null;
  }, [open]);
  const handleMenuKeyDown = (event: ReactKeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = focusItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };
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
    <div ref={dropdownRef} className={styles.dropdown} onBlur={(event) => {
      if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <button id={triggerId} ref={triggerRef} className={triggerClassName ?? styles.navMenuTrigger} type="button" aria-haspopup={variant === "menu" ? "menu" : undefined} aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={onToggle} onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        if (open) { const items = focusItems(); (event.key === "ArrowUp" ? items[items.length - 1] : items[0])?.focus(); }
        else { pendingFocusRef.current = event.key === "ArrowUp" ? "last" : "first"; onToggle(); }
      }}>
        {triggerContent ?? <span>{label}</span>}<Icon name="chevron-down" size={16} />
      </button>
      {open ? <div ref={menuRef} onKeyDown={handleMenuKeyDown} id={menuId} className={styles.dropdownMenu} role={variant === "navigation" ? "region" : "menu"} aria-label={label} onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('a,button,[role="menuitem"]')) close();
      }}>{children}</div> : null}
    </div>
  );
}
