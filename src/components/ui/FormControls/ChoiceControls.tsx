import type { InputHTMLAttributes } from "react";
import styles from "./FormControls.module.css";

interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function CheckboxControl({ label, ...props }: CheckProps) {
  return <label className={styles.checkControl}><input {...props} type="checkbox" /><span>{label}</span></label>;
}

export function RadioControl({ label, ...props }: CheckProps) {
  return <label className={styles.checkControl}><input {...props} type="radio" /><span>{label}</span></label>;
}

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function SwitchControl({ label, ...props }: SwitchProps) {
  return <label className={styles.switchControl}><input {...props} type="checkbox" role="switch" /><span className={styles.switchTrack} aria-hidden="true"><span /></span><span>{label}</span></label>;
}
