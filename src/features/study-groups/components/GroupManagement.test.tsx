import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { GroupMembers } from './GroupMembers';
import { GroupInvitations } from './GroupInvitations';
import type { GroupRole, GroupMember } from '../study-groups.types';

afterEach(() => { cleanup(); localStorage.clear(); });
const members: GroupMember[] = [
  { userId: 'owner', displayName: 'Owner fixture', role: 'OWNER', joinedAt: '2026-10-01T00:00:00Z' },
  { userId: 'moderator', displayName: 'Moderator fixture', role: 'MODERATOR', joinedAt: '2026-10-02T00:00:00Z' },
  { userId: 'member', displayName: 'Member fixture', role: 'MEMBER', joinedAt: '2026-10-03T00:00:00Z' },
];
function renderMembers(role: GroupRole) {
  localStorage.setItem('congdongngonngu.ui-locale.v1', 'en');
  const action = vi.fn();
  render(<UiLocaleProvider><GroupMembers role={role} userId={role.toLowerCase()} members={members} busy={false} onAction={action}/></UiLocaleProvider>);
  return action;
}
it('shows actual membership dates and current-actor identity without activity metadata', () => {
  renderMembers('MEMBER');
  const row = screen.getByText('Member fixture').closest('li')!;
  expect(within(row).getByText('You')).toBeVisible();
  expect(row.querySelector('time')).toHaveAttribute('dateTime', '2026-10-03T00:00:00Z');
  expect(screen.getByText('Roles apply within this study group.')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it.each(['OWNER', 'MODERATOR'] as const)('preserves the %s role-management boundary', async role => {
  const action = renderMembers(role);
  const moderatorRow = screen.getByText('Moderator fixture').closest('li')!;
  const memberRow = screen.getByText('Member fixture').closest('li')!;
  expect(within(screen.getByText('Owner fixture').closest('li')!).queryByRole('button')).not.toBeInTheDocument();
  if (role === 'OWNER') {
    expect(within(moderatorRow).getByRole('button', { name: 'Remove moderator role' })).toBeInTheDocument();
    await userEvent.click(within(memberRow).getByRole('button', { name: 'Assign moderator' }));
    expect(action).toHaveBeenCalledWith('promote', 'member');
  } else {
    expect(within(moderatorRow).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transfer ownership' })).not.toBeInTheDocument();
    await userEvent.click(within(memberRow).getByRole('button', { name: 'Remove member' }));
    expect(action).toHaveBeenCalledWith('remove', 'member');
  }
});
it('presents invitation state and expiry without recovering an issued secret', () => {
  localStorage.setItem('congdongngonngu.ui-locale.v1', 'en');
  render(<UiLocaleProvider><GroupInvitations busy={false} onIssue={vi.fn()} onRevoke={vi.fn()} items={[
    { id: 'invite-active', state: 'UNUSED', createdAt: '2026-10-19T00:00:00Z', expiresAt: '2026-10-20T00:00:00Z' },
    { id: 'invite-expired', state: 'EXPIRED', createdAt: '2026-10-17T00:00:00Z', expiresAt: '2026-10-18T00:00:00Z' },
  ]}/></UiLocaleProvider>);
  expect(screen.getByRole('heading', { name: 'Invitation history' })).toBeVisible();
  expect(screen.getAllByRole('button', { name: 'Revoke invitation' })).toHaveLength(1);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Copy/ })).not.toBeInTheDocument();
});
