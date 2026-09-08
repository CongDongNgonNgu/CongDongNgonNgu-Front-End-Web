import styles from "./FormControls.module.css";

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
    <div className={styles.tabs} role="tablist" aria-label="Các mục nội dung">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} disabled={tab.disabled} className={value === tab.id ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
