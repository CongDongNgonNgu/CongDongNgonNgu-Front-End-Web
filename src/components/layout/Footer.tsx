import { Link } from "react-router-dom";
import { futureLabel } from "../navigation/navigation";
import { Badge } from "../ui/Surface";

interface FooterItem {
  label: string;
  href?: string;
}

const footerGroups: Array<{ title: string; items: FooterItem[] }> = [
  { title: "Khám phá", items: [{ label: "Trang chủ", href: "/" }, { label: "Ngôn ngữ" }, { label: "Luyện tập" }] },
  { title: "Cộng đồng", items: [{ label: "Trao đổi" }, { label: "Phòng nói" }, { label: "Thư viện" }] },
  { title: "Hỗ trợ", items: [{ label: "Trung tâm hỗ trợ" }, { label: "Liên hệ" }, { label: "Trợ năng" }] },
  { title: "Pháp lý", items: [{ label: "Điều khoản" }, { label: "Quyền riêng tư" }] },
];

function FooterGroup({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <details className="footer-group" open>
      <summary>{title}</summary>
      <ul>
        {items.map((item) => <li key={item.label}>{item.href ? <Link to={item.href}>{item.label}</Link> : <span className="footer-disabled" aria-disabled="true"><span>{item.label}</span><Badge>{futureLabel}</Badge></span>}</li>)}
      </ul>
    </details>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell-width footer-layout">
        <div className="footer-brand">
          <Link className="footer-brand__link" to="/" aria-label="Cộng đồng ngôn ngữ, Trang chủ">
            <img src="/brand/congdongngonngu-mark.png" alt="" width="512" height="512" />
            <span>Cộng đồng ngôn ngữ</span>
          </Link>
          <p>Cùng nhau học hỏi và chia sẻ ngôn ngữ, với sự tò mò và tôn trọng khác biệt.</p>
          <p className="footer-kicker">PHASE 01 / GLOBAL SHELL</p>
        </div>
        <div className="footer-groups">
          {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
        </div>
        <div className="footer-meta">
          <label htmlFor="footer-locale">Ngôn ngữ giao diện</label>
          <select id="footer-locale" defaultValue="vi">
            <option value="vi">Tiếng Việt</option>
          </select>
          <p>© 2026 CongDongNgonNgu.vn</p>
        </div>
      </div>
    </footer>
  );
}