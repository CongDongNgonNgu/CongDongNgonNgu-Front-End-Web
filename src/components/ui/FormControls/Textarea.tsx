import { useId, type TextareaHTMLAttributes } from "react";
import { FieldShell } from "./FieldShell";
import styles from "./FormControls.module.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id: providedId, required, ...props }: TextareaProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={required}>
      <textarea {...props} id={id} className={`${styles.textInput} ${styles.textArea}`} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
    </FieldShell>
  );
}
