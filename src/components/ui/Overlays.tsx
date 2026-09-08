import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}

export function Dialog({ open, title, onClose, children, labelledBy }: DialogProps) {
  const titleId = labelledBy ?? "dialog-title";
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
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className="dialog__header">
          <h2 id={titleId}>{title}</h2>
          <Button variant="quiet" size="sm" onClick={onClose} aria-label="Đóng hộp thoại">Đóng</Button>
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (!open) {
      returnFocusRef?.current?.focus();
      return;
    }
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
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer__header">
          <div>
            <p className="panel-kicker">Điều hướng</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button ref={initialFocusRef as RefObject<HTMLButtonElement>} className="icon-button" type="button" onClick={onClose} aria-label="Đóng menu">×</button>
        </div>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  );
}

interface DropdownMenuProps {
  open: boolean;
  label: string;
  onToggle: () => void;
  children: ReactNode;
}

export function DropdownMenu({ open, label, onToggle, children }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggle();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onToggle]);

  return (
    <div className="dropdown" ref={menuRef}>
      <button className="nav-menu-trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        {label}<span aria-hidden="true">⌄</span>
      </button>
      {open ? <div className="dropdown__menu" role="menu" aria-label={label}>{children}</div> : null}
    </div>
  );
}

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  return <span className="tooltip" title={label} aria-label={label}>{children}</span>;
}