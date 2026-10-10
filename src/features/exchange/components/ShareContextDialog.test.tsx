import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ShareContextDialog } from './ShareContextDialog';
import type { ContextShareApi } from '../hooks/use-context-share';
import type { DirectMessage, SendMessageInput } from '../messaging.types';

afterEach(cleanup);
const reference = { type: 'LIBRARY_RESOURCE' as const, id: 'eb52692c-752c-4627-aa43-745927171d6a' };
const partner = { connectionId: 'pair', targetUserId: 'B', displayName: '<img src=x onerror=alert(1)> Partner B', state: 'CONNECTED' as const, updatedAt: '2026-10-10T00:00:00Z' };
const response = (input: SendMessageInput): DirectMessage => ({ id: 'message', conversationId: 'room', senderUserId: 'A', sequence: '1',
  clientMessageId: input.clientMessageId, text: input.text ?? '', createdAt: partner.updatedAt, context: { availability: 'UNAVAILABLE' } });
function fixture() {
  const api: ContextShareApi = {
    listConnections: vi.fn().mockResolvedValue({ items: [partner], nextCursor: null }),
    open: vi.fn().mockResolvedValue({ id: 'room', partner: { userId: 'B', displayName: 'B' }, headSequence: '0', changeVersion: '0',
      lastReadSequence: '0', unreadCount: '0', updatedAt: partner.updatedAt }),
    send: vi.fn().mockImplementation(async (_id, input) => response(input)),
  };return api;
}
function Location() { return <output data-testid='location'>{useLocation().pathname}</output>; }
describe('native context share dialog', () => {
  it('isolates native dialog controls from Community host descendant styles', async () => {
    render(<MemoryRouter><section className='community-detail'><ShareContextDialog open actor='A' api={fixture()} reference={reference} onClose={vi.fn()}/></section></MemoryRouter>);
    expect(screen.getByRole('dialog').closest('.community-detail')).toBeNull();
    await screen.findByRole('option', { name: partner.displayName });
  });
  it('labels connected partner and optional note, escapes names and offers the stable conversation after context-only success', async () => {
    const api = fixture();const onClose = vi.fn();
    render(<MemoryRouter><ShareContextDialog open actor='A' api={api} reference={reference} onClose={onClose}/><Location/></MemoryRouter>);
    expect(screen.getByRole('dialog', { name: 'Chia sẻ nội dung' })).toHaveAttribute('aria-modal', 'true');
    await screen.findByRole('option', { name: partner.displayName });expect(document.querySelector('[role="dialog"] img')).toBeNull();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Bạn học đã kết nối/ }), 'B');
    expect(screen.getByLabelText('Ghi chú (không bắt buộc)')).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi nội dung' }));
    await screen.findByText('Đã gửi nội dung');
    expect(screen.getByRole('button', { name: 'Mở cuộc trò chuyện' })).toHaveFocus();
    expect(api.send).toHaveBeenCalledExactlyOnceWith('room', expect.objectContaining({ text: '', contextType: reference.type, contextId: reference.id }), expect.any(AbortSignal));
    await userEvent.click(screen.getByRole('button', { name: 'Mở cuộc trò chuyện' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/exchange/conversations/room');expect(onClose).toHaveBeenCalledOnce();
  });
  it('blocks close while a send is in flight and leaves an uncertain send retryable', async () => {
    const api = fixture();let reject!: (reason: Error) => void;
    vi.mocked(api.send).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    const onClose = vi.fn();render(<MemoryRouter><ShareContextDialog open actor='A' api={api} reference={reference} onClose={onClose}/></MemoryRouter>);
    await screen.findByRole('option', { name: partner.displayName });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Bạn học đã kết nối/ }), 'B');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi nội dung' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(1));
    await userEvent.keyboard('{Escape}');expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: /Bạn học đã kết nối/ })).toBeDisabled();
    await act(async () => reject(new Error('private backend failure')));
    expect(await screen.findByRole('button', { name: 'Thử gửi lại' })).toBeEnabled();
    expect(screen.queryByText('private backend failure')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');expect(onClose).toHaveBeenCalledOnce();
  });
  it('continues empty authorized scan pages instead of treating them as the end', async () => {
    const api = fixture();vi.mocked(api.listConnections).mockResolvedValueOnce({ items: [], nextCursor: 'next' });
    render(<MemoryRouter><ShareContextDialog open actor='A' api={api} reference={reference} onClose={vi.fn()}/></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Tải thêm' }));
    expect(await screen.findByRole('option', { name: partner.displayName })).toBeInTheDocument();
  });
});
