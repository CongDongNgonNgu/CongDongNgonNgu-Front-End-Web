export type AdminReportState = 'OPEN' | 'DISMISSED' | 'ACTIONED';
export type AdminReportTargetType = 'POST' | 'COMMENT';
export type AdminUserStatus = 'ACTIVE' | 'VERIFICATION_PENDING' | 'DISABLED';
export type AdminRole = 'USER' | 'CONTRIBUTOR' | 'EXPERT' | 'MEMBER' | 'MODERATOR' | 'ADMIN';

export interface AdminMetrics {
  generatedAt: string;
  users: {
    active: number;
    verificationPending: number;
    disabled: number;
    activeAdministrators: number;
  };
  moderation: {
    openReports: number;
    actionedReports: number;
    dismissedReports: number;
  };
}

export interface AdminReport {
  id: string;
  targetType: AdminReportTargetType;
  targetId: string;
  category: string;
  details: string | null;
  state: AdminReportState;
  assignedToUserId: string | null;
  resolutionReason: string | null;
  duplicateGroupKey: string;
  duplicateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportNote {
  id: string;
  reportId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  status: AdminUserStatus;
  roles: AdminRole[];
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  correlationId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminReportListResponse {
  items: AdminReport[];
  hasMore: boolean;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminAuditListResponse {
  items: AdminAuditEntry[];
  total: number;
}
