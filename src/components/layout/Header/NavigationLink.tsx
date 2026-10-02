import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../ui/Icon/Icon';
import { isNavigationItemActive, type NavigationItem } from '../../navigation/navigation';
import type { IconName } from '../../ui/Icon/Icon';

interface NavigationLinkProps {
  item: NavigationItem;
  className?: string;
  activeClassName?: string;
  iconName?: IconName;
  label?: string;
  onClick?: () => void;
}

export function NavigationLink({ item, className, activeClassName, iconName, label, onClick }: NavigationLinkProps) {
  const { pathname, hash } = useLocation();
  if (!item.href) return null;
  const isActive = isNavigationItemActive(item, pathname, hash);
  const resolvedClassName = [className, isActive ? activeClassName : undefined].filter(Boolean).join(' ') || undefined;
  const content = <><Icon name={iconName ?? item.icon} size={18} /><span>{label ?? item.label}</span></>;
  if (item.href.startsWith('#')) return <a className={resolvedClassName} href={item.href} onClick={onClick} aria-current={isActive ? 'page' : undefined}>{content}</a>;
  return <Link className={resolvedClassName} to={item.href} onClick={onClick} aria-current={isActive ? 'page' : undefined}>{content}</Link>;
}
