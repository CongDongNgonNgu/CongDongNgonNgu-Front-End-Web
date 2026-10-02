import { useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon, type IconName } from '../../../components/ui/Icon/Icon';
import { Badge } from '../../../components/ui/Surface';
import { useAuth, type AuthStatus } from '../../auth/AuthProvider';
import type { AuthUser } from '../../auth/auth.types';
import { AdminApi, type AdminApiPort } from '../admin-api';
import type {
  AdminAuditEntry,
  AdminMetrics,
  AdminReport,
  AdminReportNote,
  AdminRole,
  AdminUser,
} from '../admin.types';
import { useAdminWorkspace } from '../useAdminWorkspace';
import styles from './AdminPage.module.css';

type AdminView = 'overview' | 'reports' | 'users' | 'audit' | 'domains';

const navItems: Array<{ id: AdminView; label: string; icon: IconName; adminOnly?: boolean }> = [
  { id: 'overview', label: 'Tổng quan', icon: 'home' },
  { id: 'reports', label: 'Moderation queue', icon: 'flag' },
  { id: 'users', label: 'Users & roles', icon: 'users', adminOnly: true },
  { id: 'audit', label: 'Audit log', icon: 'shield-check', adminOnly: true },
  { id: 'domains', label: 'Domain readiness', icon: 'compass' },
];

const domainRows = [
  { label: 'Reports & moderation', note: 'Live metrics, queue, safe case detail', state: 'operational' as const },
  { label: 'Users & roles', note: 'Admin-only safe user projection', state: 'operational' as const },
  { label: 'Library review', note: 'Existing reviewer route is available', state: 'available' as const },
  { label: 'Languages', note: 'Admin projection not available', state: 'unavailable' as const },
  { label: 'AI status', note: 'Admin projection not available', state: 'unavailable' as const },
  { label: 'Membership & payments', note: 'Admin projection not available', state: 'unavailable' as const },
  { label: 'Rooms & events', note: 'Admin projection not available', state: 'unavailable' as const },
];

export function AdminPage() {
  const { api, status, user } = useAuth();
  const adminApi = useMemo(() => new AdminApi(api), [api]);
  return <AdminPageView api={adminApi} authStatus={status} user={user} />;
}

export interface AdminPageViewProps {
  api: AdminApiPort;
  authStatus: AuthStatus;
  user: AuthUser | null;
}

export function AdminPageView({ api, authStatus, user }: AdminPageViewProps) {
  const location = useLocation();
  if (authStatus === 'loading') return <AdminLoading />;
  if (authStatus === 'unauthenticated') {
    return <Navigate to='/login' replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (!isAdminOperator(user)) return <AdminAccessDenied />;
  return <AdminWorkspace api={api} user={user!} />;
}

export function isAdminOperator(user: AuthUser | null): boolean {
  return Boolean(user?.roles.some((role) => role === 'MODERATOR' || role === 'ADMIN'));
}

export function AdminLoading() {
  return <div className={styles.loadingSurface} role='status' aria-label='Đang kiểm tra quyền truy cập admin'><Skeleton lines={7} label='Đang kiểm tra quyền truy cập admin' /></div>;
}

export function AdminAccessDenied() {
  return (
    <div className={styles.accessDenied} role='alert' aria-labelledby='admin-access-denied'>
      <p className={styles.eyebrow}>ADMIN OPERATIONS</p>
      <h1 id='admin-access-denied'>Bạn chưa được cấp quyền vận hành.</h1>
      <p>Không gian này chỉ dành cho MODERATOR và ADMIN. Quyền truy cập vẫn được kiểm tra lại ở API.</p>
    </div>
  );
}

function AdminWorkspace({ api, user }: { api: AdminApiPort; user: AuthUser }) {
  const isAdmin = user.roles.includes('ADMIN');
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const workspace = useAdminWorkspace(api, isAdmin);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);
  const activeLabel = visibleNavItems.find((item) => item.id === activeView)?.label ?? 'Tổng quan';

  const selectView = (view: AdminView) => {
    if (view === 'users' || view === 'audit') {
      if (!isAdmin) return;
    }
    setActiveView(view);
  };

  return (
    <div className={styles.page} data-testid='admin-workspace'>
      <aside className={styles.sidebar} aria-label='Điều hướng admin'>
        <div className={styles.brandBlock}>
          <Link className={styles.wordmark} to='/' aria-label='CDNNOPS — CongDongNgonNgu.vn trang chủ'>CDNN<span>OPS</span></Link>
          <p className={styles.sidebarKicker}>ADMIN OPERATIONS</p>
        </div>
        <AdminNavigation items={visibleNavItems} activeView={activeView} onSelect={selectView} />
        <div className={styles.sidebarFooter}>
          <span className={styles.statusDot} aria-hidden='true' />
          <span><strong>{isAdmin ? 'ADMIN' : 'MODERATOR'}</strong><small>{user.displayName}</small></span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <div className={styles.mobileNav}>
          <div className={styles.mobileNavHeading}><span className={styles.statusDot} aria-hidden='true' />{activeLabel}</div>
          <AdminNavigation items={visibleNavItems} activeView={activeView} onSelect={selectView} compact />
        </div>

        <header className={styles.topbar}>
          <div className={styles.environment}><span className={styles.statusDot} aria-hidden='true' />LOCAL / API</div>
          <div className={styles.topbarMeta}>
            <span>{workspace.metrics ? `Sync ${formatDate(workspace.metrics.generatedAt)}` : 'Sync chưa có dữ liệu'}</span>
            <span className={styles.topbarRule} aria-hidden='true' />
            <span>{user.email}</span>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <div>
              <p className={styles.eyebrow}>WORKSPACE / {activeLabel.toUpperCase()}</p>
              <h1>{activeLabel}</h1>
              <p className={styles.contentDescription}>Một bảng điều hành tập trung cho các tác vụ có quyền, dữ liệu kiểm chứng và trạng thái rõ ràng.</p>
            </div>
            <div className={styles.headerActions}>
              <Badge tone={workspace.error ? 'warning' : 'success'}>{workspace.error ? 'Cần kiểm tra' : 'API connected'}</Badge>
              <button className={styles.refreshButton} type='button' onClick={workspace.refresh} disabled={workspace.isRefreshing}>
                <Icon name='refresh-cw' size={16} />
                {workspace.isRefreshing ? 'Đang đồng bộ' : 'Làm mới'}
              </button>
            </div>
          </div>

          {workspace.error && !workspace.isLoading ? <ErrorState title='Không tải được workspace' description={workspace.error} onRetry={workspace.refresh} retrying={workspace.isRefreshing} /> : null}

          {workspace.isLoading ? (
            <div className={styles.loadingPanel} role='status' aria-label='Đang tải dữ liệu admin'><Skeleton lines={8} label='Đang tải dữ liệu admin' /></div>
          ) : (
            <>
              {activeView === 'overview' && <OverviewView metrics={workspace.metrics} reports={workspace.reports?.items ?? []} selectedReport={workspace.selectedReport} selectedReportNotes={workspace.selectedReportNotes} onOpenReport={workspace.openReport} isSelectingReport={workspace.isSelectingReport} onSelectView={selectView} isAdmin={isAdmin} />}
              {activeView === 'reports' && <ReportsView reports={workspace.reports?.items ?? []} selectedReport={workspace.selectedReport} selectedReportNotes={workspace.selectedReportNotes} onOpenReport={workspace.openReport} isSelectingReport={workspace.isSelectingReport} />}
              {activeView === 'users' && <UsersView users={workspace.users?.items ?? []} total={workspace.users?.total ?? 0} />}
              {activeView === 'audit' && <AuditView entries={workspace.audit?.items ?? []} total={workspace.audit?.total ?? 0} />}
              {activeView === 'domains' && <DomainReadinessView isAdmin={isAdmin} />}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminNavigation({ items, activeView, onSelect, compact = false }: { items: Array<{ id: AdminView; label: string; icon: IconName }>; activeView: AdminView; onSelect: (view: AdminView) => void; compact?: boolean }) {
  return (
    <nav className={compact ? styles.compactNavigation : styles.navigation} aria-label='Admin sections'>
      {items.map((item) => (
        <button className={activeView === item.id ? styles.navItemActive : styles.navItem} type='button' key={item.id} onClick={() => onSelect(item.id)} aria-current={activeView === item.id ? 'page' : undefined}>
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function OverviewView({ metrics, reports, selectedReport, selectedReportNotes, onOpenReport, isSelectingReport, onSelectView, isAdmin }: { metrics: AdminMetrics | null; reports: AdminReport[]; selectedReport: AdminReport | null; selectedReportNotes: AdminReportNote[]; onOpenReport: (reportId: string) => Promise<void>; isSelectingReport: boolean; onSelectView: (view: AdminView) => void; isAdmin: boolean }) {
  return (
    <>
      <MetricsGrid metrics={metrics} />
      <div className={styles.primaryGrid}>
        <section className={styles.panel} aria-labelledby='open-reports-heading'>
          <PanelHeading headingId='open-reports-heading' eyebrow='MODERATION' title='Open reports' action={<button className={styles.textButton} type='button' onClick={() => onSelectView('reports')}>View queue <span aria-hidden='true'>→</span></button>} />
          <ReportsTable reports={reports.slice(0, 6)} onOpenReport={onOpenReport} />
        </section>
        <DomainReadinessView isAdmin={isAdmin} compact />
      </div>
      <ReportDetail report={selectedReport} notes={selectedReportNotes} isLoading={isSelectingReport} />
    </>
  );
}

function MetricsGrid({ metrics }: { metrics: AdminMetrics | null }) {
  const cards = metrics ? [
    { label: 'Open reports', value: metrics.moderation.openReports, note: 'Needs review', tone: 'amber' },
    { label: 'Active users', value: metrics.users.active, note: 'Current status', tone: 'navy' },
    { label: 'Actioned reports', value: metrics.moderation.actionedReports, note: 'Resolved with action', tone: 'green' },
    { label: 'Active admins', value: metrics.users.activeAdministrators, note: 'Privileged accounts', tone: 'paper' },
  ] : [];
  return (
    <section className={styles.metricsGrid} aria-label='Admin metrics'>
      {cards.map((card) => <article className={`${styles.metricCard} ${styles[`metric${card.tone}`]}`} key={card.label}><p>{card.label}</p><strong>{formatNumber(card.value)}</strong><span>{card.note}</span></article>)}
    </section>
  );
}

function ReportsView({ reports, selectedReport, selectedReportNotes, onOpenReport, isSelectingReport }: { reports: AdminReport[]; selectedReport: AdminReport | null; selectedReportNotes: AdminReportNote[]; onOpenReport: (reportId: string) => Promise<void>; isSelectingReport: boolean }) {
  return (
    <div className={styles.singleColumn}>
      <section className={styles.panel} aria-labelledby='reports-heading'>
        <PanelHeading headingId='reports-heading' eyebrow='QUEUE / STATE = OPEN' title='Moderation reports' />
        <ReportsTable reports={reports} onOpenReport={onOpenReport} />
      </section>
      <ReportDetail report={selectedReport} notes={selectedReportNotes} isLoading={isSelectingReport} />
    </div>
  );
}

function ReportsTable({ reports, onOpenReport }: { reports: AdminReport[]; onOpenReport: (reportId: string) => Promise<void> }) {
  if (reports.length === 0) return <EmptyState title='Không có report đang mở' description='Queue hiện không có case OPEN từ API.' icon='check-circle' />;
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.reportTable}>
          <caption className={styles.visuallyHidden}>Danh sách moderation reports đang mở</caption>
          <thead><tr><th scope='col'>Case</th><th scope='col'>Target</th><th scope='col'>Category</th><th scope='col'>State</th><th scope='col'>Updated</th><th scope='col'><span className={styles.visuallyHidden}>Action</span></th></tr></thead>
          <tbody>{reports.map((report) => <tr key={report.id}><td><strong>{shortId(report.id)}</strong><span>{report.duplicateCount > 1 ? `${report.duplicateCount} duplicate reports` : 'Single report'}</span></td><td>{report.targetType}<span>{shortId(report.targetId)}</span></td><td>{report.category}</td><td><ReportStateBadge state={report.state} /></td><td>{formatDate(report.updatedAt)}</td><td><button className={styles.rowButton} type='button' onClick={() => void onOpenReport(report.id)}>Open case</button></td></tr>)}</tbody>
        </table>
      </div>
      <div className={styles.mobileReportList}>{reports.map((report) => <article className={styles.mobileReportCard} key={report.id}><div className={styles.mobileReportHeading}><strong>{shortId(report.id)}</strong><ReportStateBadge state={report.state} /></div><dl><div><dt>Target</dt><dd>{report.targetType} · {shortId(report.targetId)}</dd></div><div><dt>Category</dt><dd>{report.category}</dd></div><div><dt>Updated</dt><dd>{formatDate(report.updatedAt)}</dd></div></dl><button className={styles.rowButton} type='button' onClick={() => void onOpenReport(report.id)}>Open case <span aria-hidden='true'>→</span></button></article>)}</div>
    </>
  );
}

function ReportDetail({ report, notes, isLoading }: { report: AdminReport | null; notes: AdminReportNote[]; isLoading: boolean }) {
  return (
    <section className={styles.detailPanel} aria-labelledby='case-detail-heading'>
      <div className={styles.detailHeader}><div><p className={styles.eyebrow}>CASE DETAIL</p><h2 id='case-detail-heading'>{report ? shortId(report.id) : 'Chọn một case để xem'}</h2></div>{report ? <ReportStateBadge state={report.state} /> : null}</div>
      {isLoading ? <div className={styles.detailLoading} role='status'><Skeleton lines={4} label='Đang mở case' /></div> : report ? <div className={styles.detailBody}>
        <div className={styles.privacyBanner}><Icon name='shield-check' size={18} /><span>Reporter identity được redacted trong safe projection này.</span></div>
        <dl className={styles.detailGrid}><div><dt>Target</dt><dd>{report.targetType} / {report.targetId}</dd></div><div><dt>Category</dt><dd>{report.category}</dd></div><div><dt>Assigned to</dt><dd>{report.assignedToUserId ? shortId(report.assignedToUserId) : 'Unassigned'}</dd></div><div><dt>Duplicate group</dt><dd>{report.duplicateCount} report(s)</dd></div><div><dt>Created</dt><dd>{formatDate(report.createdAt)}</dd></div><div><dt>Updated</dt><dd>{formatDate(report.updatedAt)}</dd></div></dl>
        <div className={styles.detailCopy}><h3>Report details</h3><p>{report.details || 'Không có mô tả chi tiết.'}</p>{report.resolutionReason ? <><h3>Resolution reason</h3><p>{report.resolutionReason}</p></> : null}</div>
        <div className={styles.notesBlock}><div className={styles.subheading}><h3>Internal notes</h3><span>{notes.length}</span></div>{notes.length ? <ul>{notes.map((note) => <li key={note.id}><p>{note.body}</p><small>{shortId(note.authorUserId)} · {formatDate(note.createdAt)}</small></li>)}</ul> : <p className={styles.mutedCopy}>Chưa có note nội bộ.</p>}</div>
      </div> : <EmptyState title='Chưa chọn case' description='Mở một report từ queue để xem safe case detail và internal notes.' icon='inbox' />}
    </section>
  );
}

function UsersView({ users, total }: { users: AdminUser[]; total: number }) {
  return <section className={styles.panel} aria-labelledby='users-heading'><PanelHeading headingId='users-heading' eyebrow='ADMIN ONLY' title='Users & roles' action={<span className={styles.panelCount}>{formatNumber(total)} total</span>} />{users.length ? <div className={styles.userList}>{users.map((user) => <article className={styles.userRow} key={user.id}><div className={styles.userIdentity}><span className={styles.avatar}>{initials(user.displayName)}</span><div><strong>{user.displayName}</strong><span>{user.email}</span></div></div><div className={styles.userMeta}><div>{user.roles.map((role) => <Badge key={role} tone={role === 'ADMIN' ? 'warning' : 'neutral'}>{role}</Badge>)}</div><span>{user.status} · {user.emailVerified ? 'Verified' : 'Unverified'}</span></div></article>)}</div> : <EmptyState title='Không có user data' description='API không trả về user projection trong lần đồng bộ này.' icon='users' />}</section>;
}

function AuditView({ entries, total }: { entries: AdminAuditEntry[]; total: number }) {
  return <section className={styles.panel} aria-labelledby='audit-heading'><PanelHeading headingId='audit-heading' eyebrow='ADMIN ONLY / APPEND-ONLY' title='Audit log' action={<span className={styles.panelCount}>{formatNumber(total)} total</span>} />{entries.length ? <div className={styles.auditList}>{entries.map((entry) => <article className={styles.auditRow} key={entry.id}><div className={styles.auditMarker} aria-hidden='true'><Icon name='shield-check' size={16} /></div><div><strong>{entry.action}</strong><p>{entry.reason}</p><span>{entry.targetType} · {shortId(entry.targetId)} · actor {shortId(entry.actorUserId)}</span></div><time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time></article>)}</div> : <EmptyState title='Audit log trống' description='Các thay đổi có quyền sẽ xuất hiện ở đây sau khi được ghi bởi API.' icon='shield-check' />}</section>;
}

function DomainReadinessView({ isAdmin, compact = false }: { isAdmin: boolean; compact?: boolean }) {
  const rows = domainRows.map((row) => row.label === 'Users & roles' && !isAdmin ? { ...row, state: 'unavailable' as const, note: 'Admin-only projection — moderator không truy cập' } : row);
  const headingId = compact ? 'domain-readiness-heading-compact' : 'domain-readiness-heading';
  return <section className={compact ? `${styles.panel} ${styles.domainPanel}` : styles.panel} aria-labelledby={headingId}><PanelHeading headingId={headingId} eyebrow='SYSTEM MAP' title='Domain readiness' action={!compact ? <span className={styles.panelCount}>No fake data</span> : undefined} /><div className={styles.domainList}>{rows.map((row) => <div className={styles.domainRow} key={row.label}><span className={`${styles.domainIcon} ${styles[`domain${row.state}`]}`} aria-hidden='true'><Icon name={row.state === 'operational' ? 'check' : row.state === 'available' ? 'arrow-left-right' : 'info'} size={16} /></span><div><strong>{row.label}</strong><span>{row.note}</span></div><Badge tone={row.state === 'operational' ? 'success' : row.state === 'available' ? 'info' : 'neutral'}>{row.state === 'operational' ? 'Operational' : row.state === 'available' ? 'Available' : 'Unavailable'}</Badge></div>)}</div>{!compact ? <p className={styles.domainFootnote}>Unsupported domains remain explicit until their backend projection and authorization contract land.</p> : null}</section>;
}

function PanelHeading({ eyebrow, title, action, headingId }: { eyebrow: string; title: string; action?: ReactNode; headingId?: string }) {
  return <div className={styles.panelHeading}><div><p className={styles.eyebrow}>{eyebrow}</p><h2 id={headingId}>{title}</h2></div>{action}</div>;
}

function ReportStateBadge({ state }: { state: AdminReport['state'] }) {
  return <Badge tone={state === 'OPEN' ? 'warning' : state === 'ACTIONED' ? 'success' : 'neutral'}>{state}</Badge>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời điểm';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}
