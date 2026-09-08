import { Button } from "../Button";
import styles from "./Feedback.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <Button variant="quiet" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</Button>
      <span aria-live="polite">Trang {page} / {totalPages}</span>
      <Button variant="quiet" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau</Button>
    </nav>
  );
}
