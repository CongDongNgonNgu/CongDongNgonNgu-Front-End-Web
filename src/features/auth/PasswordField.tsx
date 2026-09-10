import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { FieldShell } from '../../components/ui/FormControls/FieldShell';
import formStyles from '../../components/ui/FormControls/FormControls.module.css';
import styles from './PasswordField.module.css';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function PasswordField({ label, hint, error, id: providedId, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={props.required}>
      <div className={styles.passwordControl}>
        <input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          className={formStyles.textInput}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          className={styles.passwordReveal}
          type='button'
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
        >
          {visible ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
    </FieldShell>
  );
}
