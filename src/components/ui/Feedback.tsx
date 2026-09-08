import { useId, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";

interface SkeletonProps {
  lines?: number;
  label?: string;
}

export function Skeleton({ lines = 3, label = "Đang tải nội dung" }: SkeletonProps) {
  return (
    <div className="skeleton-group" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: lines }, (_, index) => <span key={index} className={index === 0 ? "skeleton-line skeleton-line--wide" : "skeleton-line"} aria-hidden="true" />)}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
}

export function EmptyState({ title, description, icon = "·" }: EmptyStateProps) {
  return (
    <div className="feedback-state feedback-state--empty" role="status">
      <span className="feedback-state__icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
  retrying?: boolean;
}

export function ErrorState({ title, description, onRetry, retryLabel = "Thử lại", retrying = false }: ErrorStateProps) {
  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <span className="feedback-state__icon" aria-hidden="true">!</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Button onClick={onRetry} loading={retrying}>{retryLabel}</Button>
    </div>
  );
}

interface ToastProps {
  children: ReactNode;
  tone?: "info" | "success" | "danger";
  onClose?: () => void;
}

export function Toast({ children, tone = "info", onClose }: ToastProps) {
  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      <span>{children}</span>
      {onClose ? <button className="toast__close" type="button" onClick={onClose} aria-label="Đóng thông báo">×</button> : null}
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Phân trang">
      <Button variant="quiet" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</Button>
      <span aria-live="polite">Trang {page} / {totalPages}</span>
      <Button variant="quiet" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau</Button>
    </nav>
  );
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export function SearchField({ value, onChange, onSubmit, placeholder = "Tìm kiếm trong cộng đồng", compact = false }: SearchFieldProps) {
  const id = useId();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };
  return (
    <form className={compact ? "search-form search-form--compact" : "search-form"} role="search" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor={id}>Tìm kiếm trong cộng đồng</label>
      <span className="search-form__glyph" aria-hidden="true">⌕</span>
      <input id={id} className="search-form__input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <Button variant="quiet" size="sm" type="submit">Tìm</Button>
    </form>
  );
}