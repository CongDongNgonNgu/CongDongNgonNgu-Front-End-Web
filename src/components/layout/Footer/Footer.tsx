import { Link } from "react-router-dom";
import { Icon } from "../../ui/Icon/Icon";
import styles from "./Footer.module.css";

interface FooterItem {
  label: string;
  href: string;
}

const footerGroups: Array<{ title: string; items: FooterItem[] }> = [
  {
    title: "Khám phá",
    items: [
      { label: "Trang chủ", href: "/" },
      { label: "Ngôn ngữ", href: "#languages" },
      { label: "Cách bắt đầu", href: "#how-it-works" },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { label: "Câu chuyện học tập", href: "#community" },
      { label: "Nguyên tắc chung", href: "#community" },
    ],
  },
];

const compactFooterItems: FooterItem[] = [
  { label: "Về chúng tôi", href: "#about" },
  { label: "Quy tắc cộng đồng", href: "#community" },
  { label: "Bảo mật", href: "#privacy" },
  { label: "Điều khoản", href: "#terms" },
  { label: "Hỗ trợ", href: "#support" },
];

function FooterLink({ item }: { item: FooterItem }) {
  if (item.href.startsWith("#")) return <a href={item.href}>{item.label}</a>;
  return <Link to={item.href}>{item.label}</Link>;
}

function FooterGroup({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <details className={styles.footerGroup} open>
      <summary><span>{title}</span><Icon name="chevron-down" size={18} /></summary>
      <ul>
        {items.map((item) => <li key={item.label}><FooterLink item={item} /></li>)}
      </ul>
    </details>
  );
}

export function Footer({ compact = false, compactTone = 'light' }: { compact?: boolean; compactTone?: 'light' | 'dark' }) {
  const footerClasses = [
    styles.siteFooter,
    compact ? styles.compactFooter : '',
    compact && compactTone === 'dark' ? styles.compactFooterDark : '',
  ].filter(Boolean).join(' ');
  return (
    <footer className={footerClasses} role="contentinfo">
      <div className="shell-width">
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link className={styles.footerBrandLink} to="/" aria-label="Cộng đồng ngôn ngữ, Trang chủ">
              <img src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
              <span>Cộng đồng ngôn ngữ</span>
            </Link>
            <p>Cùng nhau học hỏi và chia sẻ ngôn ngữ, với sự tò mò và tôn trọng khác biệt.</p>
          </div>
          <nav className={styles.compactLinks} aria-label="Liên kết chân trang">
            {compactFooterItems.map((item) => <FooterLink key={item.label} item={item} />)}
          </nav>
          <div className={styles.footerGroups}>
            {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
          </div>
        </div>
        <div className={styles.footerBottom}>
          <label htmlFor="footer-locale">Ngôn ngữ giao diện</label>
          <select id="footer-locale" defaultValue="vi">
            <option value="vi">Tiếng Việt</option>
          </select>
          <button className={styles.shareButton} type="button" aria-label="Chia sẻ CongDongNgonNgu.vn"><Icon name="share" size={18} /></button>
          <p>© 2026 CongDongNgonNgu.vn</p>
        </div>
      </div>
    </footer>
  );
}
