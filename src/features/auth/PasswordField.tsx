import { useId, useState, type InputHTMLAttributes } from 'react';
import { FieldShell } from '../../components/ui/FormControls/FieldShell';
import formStyles from '../../components/ui/FormControls/FormControls.module.css';
import styles from './AuthBody.module.css';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export function PasswordField({ label, error, id: providedId, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} id={id} error={error} required={props.required}>
      <div className={styles.passwordControl}>
        <input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          className={formStyles.textInput}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? id + '-error' : undefined}
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
