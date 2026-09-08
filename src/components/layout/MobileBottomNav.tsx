import { Link } from "react-router-dom";
import { futureLabel, mobileNavigation, type NavigationItem } from "../navigation/navigation";

function FutureNavButton({ item }: { item: NavigationItem }) {
  return (
    <button className="mobile-bottom-nav__item mobile-bottom-nav__item--disabled" type="button" disabled aria-label={`${item.label}, ${futureLabel.toLowerCase()}`}>
      <span className="mobile-bottom-nav__glyph" aria-hidden="true">{item.glyph}</span>
      <span className="mobile-bottom-nav__label">{item.shortLabel}</span>
      <span className="mobile-bottom-nav__status">{futureLabel}</span>
    </button>
  );
}

export function MobileBottomNav() {
  const [home, ...futureItems] = mobileNavigation;
  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng chính trên di động">
      <Link className="mobile-bottom-nav__item mobile-bottom-nav__item--active" to={home.href ?? "/"} aria-current="page">
        <span className="mobile-bottom-nav__glyph" aria-hidden="true">{home.glyph}</span>
        <span className="mobile-bottom-nav__label">{home.shortLabel}</span>
        <span className="mobile-bottom-nav__status" aria-hidden="true">Đang xem</span>
      </Link>
      {futureItems.map((item) => <FutureNavButton item={item} key={item.id} />)}
    </nav>
  );
}