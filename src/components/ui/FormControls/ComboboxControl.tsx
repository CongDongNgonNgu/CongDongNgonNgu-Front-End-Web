import { useId, type ChangeEvent } from "react";
import { FieldShell } from "./FieldShell";
import styles from "./FormControls.module.css";

interface ComboboxProps {
  label: string;
  options: string[];
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export function ComboboxControl({ label, options, value, onChange, placeholder }: ComboboxProps) {
  const generatedId = useId();
  const listId = `${generatedId}-options`;
  return (
    <FieldShell label={label} id={generatedId}>
      <input id={generatedId} className={styles.textInput} role="combobox" list={listId} value={value} onChange={onChange} placeholder={placeholder} aria-autocomplete="list" />
      <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </FieldShell>
  );
}
