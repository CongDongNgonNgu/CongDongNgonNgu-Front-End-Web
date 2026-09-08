import { useId, type InputHTMLAttributes } from "react";
import { FieldShell } from "./FieldShell";
import styles from "./FormControls.module.css";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextInput({ label, hint, error, id: providedId, required, ...props }: TextInputProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={required}>
      <input {...props} id={id} className={styles.textInput} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
    </FieldShell>
  );
}
