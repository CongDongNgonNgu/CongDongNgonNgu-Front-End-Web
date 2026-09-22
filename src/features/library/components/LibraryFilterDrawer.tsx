import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import styles from './LibraryFilterDrawer.module.css';

interface LibraryFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function LibraryFilterDrawer({ open, onClose, children }: LibraryFilterDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('drawer-open');
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      ));
      if (focusable.length === 0) return;
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('drawer-open');
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className={styles.layer}>
      <button className={styles.backdrop} type='button' aria-label='Đóng bộ lọc' onClick={onClose} />
      <div
        ref={panelRef}
        id='library-filter-drawer'
        className={styles.panel}
        role='dialog'
        aria-modal='true'
        aria-labelledby='library-filter-drawer-title'
      >
        <div className={styles.header}>
          <div>
            <span className={styles.kicker}>Knowledge Explorer</span>
            <h2 id='library-filter-drawer-title'>Bộ lọc tìm kiếm</h2>
          </div>
          <button ref={closeButtonRef} className={styles.closeButton} type='button' onClick={onClose} aria-label='Đóng bộ lọc'>
            <Icon name='x' size={20} />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
        <div className={styles.footer}>
          <Button type='button' fullWidth onClick={onClose}>Xem kết quả</Button>
        </div>
      </div>
    </div>
  );
}
