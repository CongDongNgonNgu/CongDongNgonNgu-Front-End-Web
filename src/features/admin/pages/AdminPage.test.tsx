import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { AuthUser } from '../../auth/auth.types';
import type { AdminApiPort } from '../admin-api';
import type { AdminMetrics, AdminReport, AdminUser } from '../admin.types';
import { AdminPageView } from './AdminPage';

afterEach(cleanup);

const moderator: AuthUser = {
  id: 'moderator-1',
  email: 'moderator@example.test',
  displayName: 'Moderator One',
  status: 'ACTIVE',
  emailVerified: true,
  roles: ['MODERATOR'],
};

const admin: AuthUser = { ...moderator, id: 'admin-1', email: 'admin@example.test', displayName: 'Admin One', roles: ['ADMIN'] };

const metrics: AdminMetrics = {
  generatedAt: '2026-10-02T06:30:00.000Z',
  users: { active: 42, verificationPending: 3, disabled: 2, activeAdministrators: 2 },
  moderation: { openReports: 1, actionedReports: 18, dismissedReports: 4 },
};

const report: AdminReport = {
  id: 'report-123456789',
  targetType: 'POST',
  targetId: 'post-123456789',
  category: 'SPAM',
  details: 'Repeated promotional content',
  state: 'OPEN',
  assignedToUserId: null,
  resolutionReason: null,
  duplicateGroupKey: 'group-1',
  duplicateCount: 2,
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-02T06:00:00.000Z',
};

const user: AdminUser = {
  id: 'user-1',
  email: 'learner@example.test',
  displayName: 'Learner One',
  status: 'ACTIVE',
  roles: ['MEMBER'],
  emailVerified: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function createApi(): AdminApiPort {
  return {
    getMetrics: vi.fn().mockResolvedValue(metrics),
    listReports: vi.fn().mockResolvedValue({ items: [report], hasMore: false }),
    getReport: vi.fn().mockResolvedValue(report),
    listReportNotes: vi.fn().mockResolvedValue([]),
    listUsers: vi.fn().mockResolvedValue({ items: [user], total: 1, limit: 8, offset: 0 }),
    listAudit: vi.fn().mockResolvedValue({ items: [{ id: 'audit-1', actorUserId: 'admin-1', action: 'CONTENT_HIDE', targetType: 'COMMUNITY_POST', targetId: 'post-1', reason: 'Policy review', correlationId: 'corr-1', beforeState: null, afterState: null, metadata: null, createdAt: '2026-10-02T05:00:00.000Z' }], total: 1 }),
  };
}

function LocationProbe() {
  return <span data-testid='location'>{useLocation().pathname}</span>;
}

describe('AdminPageView', () => {
  it('redirects unauthenticated operators to login', () => {
    render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path='/admin' element={<AdminPageView api={createApi()} authStatus='unauthenticated' user={null} />} /><Route path='/login' element={<LocationProbe />} /></Routes></MemoryRouter>);
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('renders real moderator metrics and keeps reporter identity out of case detail', async () => {
    const api = createApi();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/admin']}><AdminPageView api={api} authStatus='authenticated' user={moderator} /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('MODERATOR')).toBeInTheDocument();
    expect(screen.queryByText(/reporter@example/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Open case/i })[0]);
    expect(await screen.findByText(/Reporter identity được redacted/i)).toBeInTheDocument();
    expect(screen.getByText('Repeated promotional content')).toBeInTheDocument();
    expect(screen.queryByText(/password|token|secret/i)).not.toBeInTheDocument();
  });

  it('shows admin-only user and audit projections only for an ADMIN', async () => {
    const api = createApi();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/admin']}><AdminPageView api={api} authStatus='authenticated' user={admin} /></MemoryRouter>);

    await user.click((await screen.findAllByRole('button', { name: 'Users & roles' }))[0]);
    expect(await screen.findByRole('heading', { name: 'Users & roles', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('learner@example.test')).toBeInTheDocument();
    expect(screen.queryByText(/passwordHash|accessToken/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Audit log' })[0]);
    expect(await screen.findByRole('heading', { name: 'Audit log', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('CONTENT_HIDE')).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { name: 'Audit log', level: 2 }).closest('section')!).getByText('Policy review')).toBeInTheDocument();
  });
});
