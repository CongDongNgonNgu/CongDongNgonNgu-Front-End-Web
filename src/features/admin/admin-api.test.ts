import { describe, expect, it, vi } from 'vitest';
import { AdminApi } from './admin-api';

describe('AdminApi', () => {
  it('requests metrics through the protected auth transport', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ moderation: {}, users: {}, generatedAt: '2026-01-01T00:00:00.000Z' });
    const api = new AdminApi({ requestProtected });

    await api.getMetrics();

    expect(requestProtected).toHaveBeenCalledWith('/admin/metrics');
  });

  it('serializes queue filters and clamps the page size', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ items: [], hasMore: false });
    const api = new AdminApi({ requestProtected });

    await api.listReports({ state: 'OPEN', targetType: 'COMMENT', assignedToUserId: 'moderator-1', limit: 999 });

    expect(requestProtected).toHaveBeenCalledWith('/admin/reports?state=OPEN&targetType=COMMENT&assignedToUserId=moderator-1&limit=100');
  });

  it('keeps admin-only list queries bounded and URL encoded', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });
    const api = new AdminApi({ requestProtected });

    await api.listUsers({ search: 'Lan & Mai', role: 'ADMIN', limit: 999, offset: -5 });
    await api.listAudit({ action: 'CONTENT_REMOVE', targetType: 'COMMUNITY_POST', limit: 0, offset: 100_001 });

    expect(requestProtected).toHaveBeenNthCalledWith(1, '/admin/users?search=Lan+%26+Mai&role=ADMIN&limit=100&offset=0');
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/admin/audit?action=CONTENT_REMOVE&targetType=COMMUNITY_POST&limit=1&offset=100000');
  });
});
