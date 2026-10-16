import { useState, type ReactNode } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import styles from './CommunityDisclosure.module.css';

export function CommunityDisclosure({ title, children, defaultOpen = false, className = '' }: { title: ReactNode; children: ReactNode | ((expanded: boolean) => ReactNode); defaultOpen?: boolean; className?: string }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  return <details className={styles.disclosure + ' ' + className} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary aria-expanded={expanded}><span>{title}</span><Icon name='chevron-down' size={18} className={styles.chevron} /></summary>
    {typeof children === 'function' ? children(expanded) : children}
  </details>;
}
