import { Link } from 'react-router-dom';
import { Icon } from '../../ui/Icon/Icon';
import type { NavigationItem } from '../../navigation/navigation';

interface NavigationLinkProps {
  item: NavigationItem;
  className?: string;
  onClick?: () => void;
}

export function NavigationLink({ item, className, onClick }: NavigationLinkProps) {
  if (!item.href) return null;
  const content = <><Icon name={item.icon} size={18} /><span>{item.label}</span></>;
  if (item.href.startsWith('#')) return <a className={className} href={item.href} onClick={onClick}>{content}</a>;
  return <Link className={className} to={item.href} onClick={onClick} aria-current={item.id === 'home' ? 'page' : undefined}>{content}</Link>;
}
