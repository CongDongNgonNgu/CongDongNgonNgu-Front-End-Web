import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Chip.module.css";

interface ChipProps {
  children: ReactNode;
  onRemove?: () => void;
}

export function Chip({ children, onRemove }: ChipProps) {
  return (
    <span className={styles.chip}>
      <span>{children}</span>
      {onRemove ? <button type="button" onClick={onRemove} aria-label={`Xóa ${String(children)}`}><Icon name="x" size={16} /></button> : null}
    </span>
  );
}
