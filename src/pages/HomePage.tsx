import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, LanguageIndicator, ListRow } from "../components/ui/Surface";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";

const foundationItems = [
  { label: "Không gian mở", description: "Một điểm bắt đầu nhẹ nhàng cho người học ở mọi ngôn ngữ." },
  { label: "Tôn trọng khác biệt", description: "Ngữ cảnh, giọng nói và trải nghiệm của mỗi người đều có chỗ đứng." },
  { label: "Phát triển có kiểm chứng", description: "Tính năng mới chỉ xuất hiện khi có hợp đồng và kiểm thử phù hợp." },
];

export function HomePage() {
  const [retryRequested, setRetryRequested] = useState(false);

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="page-title">
        <div className="home-hero__copy">
          <p className="eyebrow">Trang chủ / Phase 01</p>
          <h1 id="page-title">Học ngôn ngữ cùng nhau.</h1>
          <p className="lede">Một cộng đồng toàn cầu để học hỏi, thực hành và chia sẻ ngôn ngữ với sự tò mò và tôn trọng.</p>
          <div className="home-hero__actions">
            <Link className="button-link button-link--primary" to="/">Đang ở Trang chủ</Link>
            <a className="text-link" href="#system-states">Xem trạng thái nền tảng</a>
          </div>
        </div>
        <aside className="home-hero__aside" aria-label="Định hướng sản phẩm">
          <p className="panel-kicker">Một không gian chung</p>
          <p className="home-hero__quote">“Ngôn ngữ mở ra khi có người cùng lắng nghe.”</p>
          <LanguageIndicator language="Cộng đồng toàn cầu" level="Đang xây nền" />
        </aside>
      </section>

      <section className="foundation-section" aria-labelledby="foundation-title">
        <div className="section-heading">
          <div><p className="eyebrow">Nền tảng</p><h2 id="foundation-title">Bắt đầu bằng một không gian đáng tin.</h2></div>
          <p>Phase 01 tập trung vào những chi tiết giữ cho mọi cuộc trò chuyện sau này dễ tiếp cận, rõ ràng và có thể mở rộng.</p>
        </div>
        <div className="foundation-list foundation-list--wide">
          {foundationItems.map((item) => <ListRow key={item.label}><span className="list-marker" aria-hidden="true">/</span><span><strong>{item.label}</strong><span>{item.description}</span></span></ListRow>)}
        </div>
      </section>

      <section className="system-states" id="system-states" aria-labelledby="system-states-title">
        <div className="section-heading section-heading--compact">
          <div><p className="eyebrow">Trạng thái hệ thống</p><h2 id="system-states-title">Các mẫu phản hồi sẵn sàng cho nội dung thật.</h2></div>
          <p>Những mẫu này được giữ gọn để các tính năng Phase 02 có thể dùng lại mà không thay đổi ngôn ngữ giao diện.</p>
        </div>
        <div className="state-grid">
          <Card className="state-panel">
            <div className="state-panel__heading"><h3>Đang tải</h3><Badge tone="info">Loading</Badge></div>
            <Skeleton lines={3} />
          </Card>
          <Card className="state-panel">
            <div className="state-panel__heading"><h3>Chưa có nội dung</h3><Badge tone="info">Empty</Badge></div>
            <EmptyState title="Chưa có hoạt động" description="Khu vực này sẽ mở khi các tính năng cộng đồng được sẵn sàng." icon="·" />
          </Card>
          <Card className="state-panel">
            <div className="state-panel__heading"><h3>Có thể thử lại</h3><Badge tone="danger">Error</Badge></div>
            {retryRequested ? <p className="state-confirmation" role="status">Yêu cầu thử lại đã được ghi nhận.</p> : <ErrorState title="Đã xảy ra lỗi" description="Không thể tải hoạt động lúc này. Bạn có thể thử lại sau." onRetry={() => setRetryRequested(true)} />}
          </Card>
          <Card className="state-panel state-panel--future">
            <div className="state-panel__heading"><h3>Cộng đồng</h3><Badge tone="warning">Sắp có</Badge></div>
            <p className="future-state__label">Tính năng đang được chuẩn bị.</p>
            <p className="future-state__copy">Khi mở, đây sẽ là nơi gặp gỡ người học và người sử dụng ngôn ngữ từ nhiều nền văn hóa.</p>
            <Button variant="quiet" disabled>Khám phá cộng đồng</Button>
          </Card>
        </div>
      </section>
    </div>
  );
}