import type { ReactNode } from "react";
import styles from "./FormControls.module.css";

interface FieldShellProps {
  label: string;
  id?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldShell({ label, id, hint, error, required, children }: FieldShellProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label} {required ? <span aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? <p className={styles.fieldError} id={`${id}-error`} role='alert'>{error}</p> : null}
      {!error && hint ? <p className={styles.fieldHint} id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}
