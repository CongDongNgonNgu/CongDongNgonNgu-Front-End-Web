import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

function FieldShell({ label, id, hint, error, required, children }: FieldShellProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label} {required ? <span aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? <p className="field__error" id={`${id}-error`}>{error}</p> : null}
      {!error && hint ? <p className="field__hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}

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
      <input {...props} id={id} className="text-input" required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
    </FieldShell>
  );
}

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
      <textarea {...props} id={id} className="text-input text-area" required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
    </FieldShell>
  );
}

interface SelectControlProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function SelectControl({ label, hint, error, id: providedId, required, children, ...props }: SelectControlProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={required}>
      <select {...props} id={id} className="select-control" required={required} aria-invalid={Boolean(error)}>
        {children}
      </select>
    </FieldShell>
  );
}

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
      <input id={generatedId} className="text-input" role="combobox" list={listId} value={value} onChange={onChange} placeholder={placeholder} aria-autocomplete="list" />
      <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </FieldShell>
  );
}

interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function CheckboxControl({ label, ...props }: CheckProps) {
  return <label className="check-control"><input {...props} type="checkbox" /><span>{label}</span></label>;
}

export function RadioControl({ label, ...props }: CheckProps) {
  return <label className="check-control"><input {...props} type="radio" /><span>{label}</span></label>;
}

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function SwitchControl({ label, ...props }: SwitchProps) {
  return <label className="switch-control"><input {...props} type="checkbox" role="switch" /><span className="switch-control__track" aria-hidden="true"><span /></span><span>{label}</span></label>;
}

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Các mục nội dung">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} disabled={tab.disabled} className={value === tab.id ? "tab tab--active" : "tab"} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}