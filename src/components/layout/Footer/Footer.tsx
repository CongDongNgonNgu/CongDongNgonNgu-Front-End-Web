import { Link } from "react-router-dom";
import { Icon } from "../../ui/Icon/Icon";
import styles from "./Footer.module.css";
import { useUiLocale } from '../../../features/ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../../../features/ui-locale/ui-locale';
import { UiLocaleSelector } from '../Header/UiLocaleSelector';

interface FooterItem {
  label: TranslationKey;
  href?: string;
  available?: boolean;
}

const footerGroups: Array<{ title: TranslationKey; items: FooterItem[] }> = [
  {
    title: 'navigation.home',
    items: [
      { label: 'navigation.homeShort', href: "/" },
      { label: 'navigation.exchange', href: "/exchange" },
      { label: 'navigation.languages', href: "/languages" },
      { label: 'navigation.how-it-works', href: "/#how-it-works" },
    ],
  },
  {
    title: 'navigation.community',
    items: [
      { label: 'shell.learningStories', href: "/#community" },
      { label: 'shell.guidelines', href: "/#community" },
    ],
  },
];

const compactFooterItems: FooterItem[] = [
  { label: 'shell.about', available: false },
  { label: 'shell.communityRules', available: false },
  { label: 'shell.privacy', available: false },
  { label: 'shell.terms', available: false },
  { label: 'shell.support', available: false },
];

function FooterLink({ item }: { item: FooterItem }) {
  const { t } = useUiLocale();
  if (item.available === false || !item.href) return <span className={styles.footerUnavailable} aria-disabled='true'>{t(item.label)}</span>;
  return <Link to={item.href}>{t(item.label)}</Link>;
}

function FooterGroup({ title, items }: { title: TranslationKey; items: FooterItem[] }) {
  const { t } = useUiLocale();
  return (
    <details className={styles.footerGroup} open>
      <summary><span>{t(title)}</span><Icon name="chevron-down" size={18} /></summary>
      <ul>
        {items.map((item) => <li key={item.label}><FooterLink item={item} /></li>)}
      </ul>
    </details>
  );
}

export function Footer({ compact = false, compactTone = 'light' }: { compact?: boolean; compactTone?: 'light' | 'dark' }) {
  const { t } = useUiLocale();
  const footerClasses = [
    styles.siteFooter,
    compact ? styles.compactFooter : '',
    !compact || compactTone !== 'dark' ? styles.lightFooter : '',
    compact && compactTone === 'dark' ? styles.compactFooterDark : '',
  ].filter(Boolean).join(' ');
  return (
    <footer className={footerClasses} role="contentinfo">
      <div className="shell-width">
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link className={styles.footerBrandLink} to="/" aria-label={t('shell.brandHome')}>
              <img src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
              <span>{t('shell.brand')}</span>
            </Link>
            <p>{t('shell.footerDescription')}</p>
          </div>
          <nav className={styles.compactLinks} aria-label={t('shell.footerLinks')}>
            {compactFooterItems.map((item) => <FooterLink key={item.label} item={item} />)}
          </nav>
          <div className={styles.footerGroups}>
            {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
          </div>
        </div>
        <div className={styles.footerBottom}>
          <div className={styles.localeControl}><UiLocaleSelector /></div>
          <button className={styles.shareButton} type="button" aria-label={t('shell.share')}><Icon name="share" size={18} /></button>
          <p>© 2026 CongDongNgonNgu.vn</p>
        </div>
      </div>
    </footer>
  );
}
