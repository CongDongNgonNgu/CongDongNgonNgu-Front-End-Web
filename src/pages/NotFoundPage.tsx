import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="eyebrow">404 / Không tìm thấy</p>
      <h1 id="not-found-title">Trang này chưa có.</h1>
      <p>Đường dẫn bạn chọn chưa thuộc phạm vi của nền tảng Phase 01.</p>
      <Link className="text-link" to="/">Quay về Trang chủ</Link>
    </section>
  );
}