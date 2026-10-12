import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { ConnectedPartnerInvitation } from './ConnectedPartnerInvitation';
import type { StudyGroupsApi } from '../study-groups.api';
import { UI_LOCALE_STORAGE_KEY } from '../../ui-locale/ui-locale';

const partner = (id: string) => ({ connectionId: id, targetUserId: id, displayName: 'Partner ' + id, state: 'CONNECTED' as const, updatedAt: '' });
const invite = { id: 'invitation', token: 'one-time-secret', expiresAt: '2030-01-01T00:00:00Z' };
afterEach(() => { cleanup(); localStorage.clear(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function setup(list = vi.fn().mockResolvedValue({ items: [partner('a')], nextCursor: null }), issue = vi.fn().mockResolvedValue(invite)) {
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, 'en');
  const api = { issueConnectedPartner: issue } as unknown as StudyGroupsApi;
  const connectionsApi = { listConnections: list };
  const props = { api, connectionsApi, groupId: 'group', groupName: 'Owned group', userId: 'owner', enabled: true };
  const ui = (overrides = {}) => <UiLocaleProvider><ConnectedPartnerInvitation {...props} {...overrides} /></UiLocaleProvider>;
  const rendered = render(ui());
  return { ...rendered, ui, issue, list };
}
async function open() { fireEvent.click(screen.getByRole('button', { name: 'Invite a connected partner' })); await screen.findByRole('radio', { name: /Partner a/ }); }
async function issue() { fireEvent.click(screen.getByRole('radio', { name: /Partner a/ })); fireEvent.click(screen.getByRole('button', { name: 'Create invitation code' })); }
describe('connected partner invitation', () => {
  it('loads bounded connected partners, deduplicates pages, and issues only an explicitly selected partner', async () => {
    const list = vi.fn().mockResolvedValueOnce({ items: [partner('a')], nextCursor: 'next' }).mockResolvedValueOnce({ items: [partner('a'), partner('b')], nextCursor: null });
    const s = setup(list); await open();
    expect(s.list).toHaveBeenCalledWith({ kind: 'CONNECTED', limit: 20 });
    expect(screen.getByRole('button', { name: 'Create invitation code' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Load more partners' }));
    await screen.findByRole('radio', { name: /Partner b/ });
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await issue();
    expect(s.issue).toHaveBeenCalledWith('group', 'a');
    await screen.findByDisplayValue('one-time-secret');
    expect(screen.getByDisplayValue('group')).toBeInTheDocument();
  });
  it('clears private rows on list failure and retries from the beginning', async () => {
    const list = vi.fn().mockResolvedValueOnce({ items: [partner('a')], nextCursor: 'next' }).mockRejectedValueOnce(new Error('private')).mockResolvedValueOnce({ items: [], nextCursor: null });
    setup(list); await open(); fireEvent.click(screen.getByRole('button', { name: 'Load more partners' }));
    await screen.findByRole('alert'); expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('No connected partners yet.');
    expect(list).toHaveBeenLastCalledWith({ kind: 'CONNECTED', limit: 20 });
  });
  it('discards a late secret after Escape and restores focus', async () => {
    const pending = deferred<typeof invite>(); setup(undefined, vi.fn().mockReturnValue(pending.promise));
    const trigger = screen.getByRole('button', { name: 'Invite a connected partner' }); trigger.focus();
    await open(); await issue(); fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => pending.resolve(invite));
    expect(screen.queryByDisplayValue('one-time-secret')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });
  it('rejects old A responses after A/B/A principal transitions', async () => {
    const pending = deferred<typeof invite>(); const s = setup(undefined, vi.fn().mockReturnValue(pending.promise));
    await open(); await issue(); s.rerender(s.ui({ userId: 'other' })); s.rerender(s.ui());
    await act(async () => pending.resolve(invite));
    expect(screen.queryByDisplayValue('one-time-secret')).not.toBeInTheDocument(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('clears an issued secret synchronously on ownership loss and API changes', async () => {
    const s = setup(); await open(); await issue(); await screen.findByDisplayValue('one-time-secret');
    s.rerender(s.ui({ enabled: false })); expect(screen.queryByDisplayValue('one-time-secret')).not.toBeInTheDocument();
    s.rerender(s.ui()); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await open(); await issue(); await screen.findByDisplayValue('one-time-secret');
    s.rerender(s.ui({ connectionsApi: { listConnections: s.list } })); expect(screen.queryByDisplayValue('one-time-secret')).not.toBeInTheDocument();
  });
  it('blocks duplicate submission while the request is pending', async () => {
    const pending = deferred<typeof invite>(); const s = setup(undefined, vi.fn().mockReturnValue(pending.promise));
    await open(); await issue(); fireEvent.click(screen.getByRole('button', { name: /Create invitation code/ }));
    expect(s.issue).toHaveBeenCalledTimes(1); await act(async () => pending.resolve(invite));
    await waitFor(() => expect(screen.getByDisplayValue('one-time-secret')).toBeInTheDocument());
  });
  it('never copies or stores the code automatically; explicit copy uses the native clipboard', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    setup(); await open(); await issue(); await screen.findByDisplayValue('one-time-secret');
    expect(copy).not.toHaveBeenCalled();
    expect(JSON.stringify(localStorage)).not.toContain('one-time-secret');
    expect(JSON.stringify(sessionStorage)).not.toContain('one-time-secret');
    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation token' }));
    await waitFor(() => expect(copy).toHaveBeenCalledWith('one-time-secret'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByDisplayValue('one-time-secret')).not.toBeInTheDocument();
  });
  it('discards a pending list from another group and retries only the current group scope', async () => {
    const pending = deferred<{ items: ReturnType<typeof partner>[]; nextCursor: null }>();
    const list = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue({ items: [partner('b')], nextCursor: null });
    const s = setup(list); fireEvent.click(screen.getByRole('button', { name: 'Invite a connected partner' }));
    s.rerender(s.ui({ groupId: 'new-group' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invite a connected partner' }));
    await screen.findByRole('radio', { name: /Partner b/ });
    await act(async () => pending.resolve({ items: [partner('a')], nextCursor: null }));
    expect(screen.queryByRole('radio', { name: /Partner a/ })).not.toBeInTheDocument();
  });
  it('requires a fresh connected list after a rejected issuance', async () => {
    const s = setup(undefined, vi.fn().mockRejectedValue(new Error('denied')));
    await open(); await issue(); await screen.findByRole('alert');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create invitation code' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByRole('radio', { name: /Partner a/ });
    expect(s.list).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Create invitation code' })).toBeDisabled();
  });
});
