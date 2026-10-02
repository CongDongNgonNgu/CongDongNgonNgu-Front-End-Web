import type { AuthApi } from '../auth/auth-api';
import type {
  AdminAuditEntry,
  AdminAuditListResponse,
  AdminMetrics,
  AdminReport,
  AdminReportListResponse,
  AdminReportNote,
  AdminReportState,
  AdminReportTargetType,
  AdminUser,
  AdminUserListResponse,
  AdminUserStatus,
  AdminRole,
} from './admin.types';

export interface AdminAuthTransport {
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface AdminReportsQuery {
  state?: AdminReportState;
  targetType?: AdminReportTargetType;
  assignedToUserId?: string | null;
  limit?: number;
}

export interface AdminUsersQuery {
  search?: string;
  status?: AdminUserStatus;
  role?: AdminRole;
  limit?: number;
  offset?: number;
}

export interface AdminAuditQuery {
  actorUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}

export interface AdminApiPort {
  getMetrics(): Promise<AdminMetrics>;
  listReports(query?: AdminReportsQuery): Promise<AdminReportListResponse>;
  getReport(reportId: string): Promise<AdminReport>;
  listReportNotes(reportId: string): Promise<AdminReportNote[]>;
  listUsers(query?: AdminUsersQuery): Promise<AdminUserListResponse>;
  listAudit(query?: AdminAuditQuery): Promise<AdminAuditListResponse>;
}

export class AdminApi implements AdminApiPort {
  constructor(private readonly auth: AdminAuthTransport | AuthApi) {}

  getMetrics(): Promise<AdminMetrics> {
    return this.auth.requestProtected<AdminMetrics>('/admin/metrics');
  }

  listReports(query: AdminReportsQuery = {}): Promise<AdminReportListResponse> {
    return this.auth.requestProtected<AdminReportListResponse>(withQuery('/admin/reports', {
      state: query.state,
      targetType: query.targetType,
      assignedToUserId: query.assignedToUserId ?? undefined,
      limit: query.limit === undefined ? undefined : clamp(query.limit, 1, 100).toString(),
    }));
  }

  getReport(reportId: string): Promise<AdminReport> {
    return this.auth.requestProtected<AdminReport>(`/admin/reports/${encodeURIComponent(reportId)}`);
  }

  listReportNotes(reportId: string): Promise<AdminReportNote[]> {
    return this.auth.requestProtected<AdminReportNote[]>(`/admin/reports/${encodeURIComponent(reportId)}/notes`);
  }

  listUsers(query: AdminUsersQuery = {}): Promise<AdminUserListResponse> {
    return this.auth.requestProtected<AdminUserListResponse>(withQuery('/admin/users', {
      search: query.search?.trim() || undefined,
      status: query.status,
      role: query.role,
      limit: query.limit === undefined ? undefined : clamp(query.limit, 1, 100).toString(),
      offset: query.offset === undefined ? undefined : clamp(query.offset, 0, 100_000).toString(),
    }));
  }

  listAudit(query: AdminAuditQuery = {}): Promise<AdminAuditListResponse> {
    return this.auth.requestProtected<AdminAuditListResponse>(withQuery('/admin/audit', {
      actorUserId: query.actorUserId,
      action: query.action?.trim() || undefined,
      targetType: query.targetType?.trim() || undefined,
      targetId: query.targetId?.trim() || undefined,
      limit: query.limit === undefined ? undefined : clamp(query.limit, 1, 100).toString(),
      offset: query.offset === undefined ? undefined : clamp(query.offset, 0, 100_000).toString(),
    }));
  }
}

function withQuery(path: string, values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, value);
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(Math.trunc(value), minimum), maximum);
}
