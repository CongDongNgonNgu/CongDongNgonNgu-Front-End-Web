import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../ui/Icon/Icon';
import { isNavigationItemActive, type NavigationItem } from '../../navigation/navigation';
import type { IconName } from '../../ui/Icon/Icon';
import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';

interface NavigationLinkProps {
  item: NavigationItem;
  className?: string;
  activeClassName?: string;
  iconName?: IconName;
  label?: string;
  short?: boolean;
  onClick?: () => void;
}

export function NavigationLink({ item, className, activeClassName, iconName, label, short, onClick }: NavigationLinkProps) {
  const { t } = useUiLocale();
  const { pathname, hash } = useLocation();
  if (!item.href) return null;
  const isActive = isNavigationItemActive(item, pathname, hash);
  const resolvedClassName = [className, isActive ? activeClassName : undefined].filter(Boolean).join(' ') || undefined;
  const key = short ? item.shortLabelKey ?? item.labelKey : item.labelKey;
  const content = <><Icon name={iconName ?? item.icon} size={18} /><span>{label ?? (key ? t(key) : item.label)}</span></>;
  if (item.href.startsWith('#')) return <a className={resolvedClassName} href={item.href} onClick={onClick} aria-current={isActive ? 'page' : undefined}>{content}</a>;
  return <Link className={resolvedClassName} to={item.href} onClick={onClick} aria-current={isActive ? 'page' : undefined}>{content}</Link>;
}
