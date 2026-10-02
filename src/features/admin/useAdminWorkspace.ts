import { useCallback, useEffect, useState } from 'react';
import type {
  AdminAuditListResponse,
  AdminMetrics,
  AdminReport,
  AdminReportListResponse,
  AdminReportNote,
  AdminUserListResponse,
} from './admin.types';
import type { AdminApiPort } from './admin-api';

export interface AdminWorkspaceState {
  metrics: AdminMetrics | null;
  reports: AdminReportListResponse | null;
  users: AdminUserListResponse | null;
  audit: AdminAuditListResponse | null;
  selectedReport: AdminReport | null;
  selectedReportNotes: AdminReportNote[];
  isLoading: boolean;
  isRefreshing: boolean;
  isSelectingReport: boolean;
  error: string | null;
  refresh: () => void;
  openReport: (reportId: string) => Promise<void>;
}

export function useAdminWorkspace(api: AdminApiPort, isAdmin: boolean): AdminWorkspaceState {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<AdminReportListResponse | null>(null);
  const [users, setUsers] = useState<AdminUserListResponse | null>(null);
  const [audit, setAudit] = useState<AdminAuditListResponse | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [selectedReportNotes, setSelectedReportNotes] = useState<AdminReportNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSelectingReport, setIsSelectingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsRefreshing(refreshToken > 0);
    setError(null);

    const usersRequest = isAdmin ? api.listUsers({ limit: 8, offset: 0 }) : Promise.resolve(null);
    const auditRequest = isAdmin ? api.listAudit({ limit: 8, offset: 0 }) : Promise.resolve(null);

    Promise.all([
      api.getMetrics(),
      api.listReports({ state: 'OPEN', limit: 25 }),
      usersRequest,
      auditRequest,
    ]).then(([nextMetrics, nextReports, nextUsers, nextAudit]) => {
      if (cancelled) return;
      setMetrics(nextMetrics);
      setReports(nextReports);
      setUsers(nextUsers);
      setAudit(nextAudit);
      setSelectedReport(null);
      setSelectedReportNotes([]);
    }).catch(() => {
      if (!cancelled) setError('Không thể tải dữ liệu vận hành admin. Hãy thử lại hoặc kiểm tra phiên đăng nhập.');
    }).finally(() => {
      if (cancelled) return;
      setIsLoading(false);
      setIsRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [api, isAdmin, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const openReport = useCallback(async (reportId: string) => {
    setIsSelectingReport(true);
    setError(null);
    try {
      const [report, notes] = await Promise.all([
        api.getReport(reportId),
        api.listReportNotes(reportId),
      ]);
      setSelectedReport(report);
      setSelectedReportNotes(notes);
    } catch {
      setError('Không thể mở hồ sơ moderation này.');
    } finally {
      setIsSelectingReport(false);
    }
  }, [api]);

  return {
    metrics,
    reports,
    users,
    audit,
    selectedReport,
    selectedReportNotes,
    isLoading,
    isRefreshing,
    isSelectingReport,
    error,
    refresh,
    openReport,
  };
}
