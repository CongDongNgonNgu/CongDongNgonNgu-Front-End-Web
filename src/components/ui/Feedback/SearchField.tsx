import { useId, type FormEvent } from "react";
import { Button } from "../Button";
import { Icon } from "../Icon/Icon";
import styles from "./Feedback.module.css";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  compact?: boolean;
  label?: string;
  submitLabel?: string;
}

export function SearchField({ value, onChange, onSubmit, placeholder = "Tìm kiếm trong cộng đồng", compact = false, label = 'Tìm kiếm trong cộng đồng', submitLabel = 'Tìm' }: SearchFieldProps) {
  const id = useId();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };
  return (
    <form className={[styles.searchForm, compact ? styles.searchFormCompact : ""].filter(Boolean).join(" ")} role="search" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <Icon name="search" size={18} className={styles.searchFormIcon} />
      <input id={id} className={styles.searchFormInput} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <Button className={compact ? styles.searchSubmit : undefined} variant="quiet" size="sm" type="submit">{submitLabel}</Button>
    </form>
  );
}
