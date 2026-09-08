import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { FieldShell } from "./FieldShell";
import styles from "./FormControls.module.css";

interface SelectControlProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function SelectControl({ label, hint, error, id: providedId, required, children, ...props }: SelectControlProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={required}>
      <select {...props} id={id} className={styles.selectControl} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
        {children}
      </select>
    </FieldShell>
  );
}
