import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { MessagesPageView } from './MessagesPage';
import type { DirectConversationPage, DirectConversationSummary, DirectMessage, MessagingApiContract, SendMessageInput } from '../messaging.types';

afterEach(cleanup);
const summary: DirectConversationSummary = { id: 'room', partner: { userId: 'B', displayName: 'Nguyễn Thị Thu Hương' },
  headSequence: '1', changeVersion: '1', lastReadSequence: '0', unreadCount: '1', updatedAt: '2026-10-10T00:00:00.000Z' };
const message: DirectMessage = { id: 'one', conversationId: 'room', senderUserId: 'B', sequence: '1',
  text: '<img src=x onerror=alert(1)>\nXin chào 🌏', clientMessageId: 'client-one', createdAt: '2026-10-10T00:00:00.000Z' };
function api(): MessagingApiContract {
  return { open: vi.fn(), list: vi.fn().mockResolvedValue({ items: [summary], nextCursor: null }), get: vi.fn().mockResolvedValue(summary),
    history: vi.fn().mockResolvedValue({ items: [message], nextCursor: null, beforeCursor: 'before', afterCursor: 'after' }),
    send: vi.fn(), markRead: vi.fn().mockResolvedValue(undefined) };
}
const session = { getAccessToken: () => 'synthetic', refresh: vi.fn().mockResolvedValue({ id: 'A' }) };
const stream = { connect: vi.fn(() => new Promise<void>(() => undefined)) };
const view = (source: MessagingApiContract, conversationId?: string, actor: string | undefined = 'A') =>
  render(<MemoryRouter><MessagesPageView api={source} conversationId={conversationId} actor={actor} streamAuth={session} streamClient={stream}/></MemoryRouter>);

describe('native messages page integration', () => {
  it('rechecks a busy list after thread denial instead of restoring its late private row', async () => {
    let finish!: (value: DirectConversationPage) => void;
    const source = api();
    vi.mocked(source.list).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue({ items: [], nextCursor: null });
    view(source, 'room');
    await screen.findByRole('textbox', { name: 'Tin nhắn' });
    vi.mocked(source.send).mockRejectedValueOnce(new ApiClientError('denied', 403, 'MESSAGE_UNAVAILABLE'));
    vi.mocked(source.get).mockRejectedValue(new ApiClientError('denied', 403, 'MESSAGE_UNAVAILABLE'));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tin nhắn' }), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('Hội thoại hiện không khả dụng. Kiểm tra lại kết nối với bạn học.');
    finish({ items: [summary], nextCursor: null });
    await waitFor(() => expect(source.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Nguyễn Thị Thu Hương/ })).not.toBeInTheDocument());
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });
  it('shows a login journey without loading private data for guests', () => {
    const source = api(); view(source, undefined, '');
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login?returnTo=%2Fexchange%2Fconversations');
    expect(source.list).not.toHaveBeenCalled(); expect(source.get).not.toHaveBeenCalled();
  });
  it('continues an empty authorized list scan and uses native conversation links', async () => {
    const source = api(); vi.mocked(source.list).mockResolvedValueOnce({ items: [], nextCursor: 'next' });
    view(source);
    await screen.findByText('Chưa có hội thoại khả dụng ở trang này. Bạn có thể tải tiếp.');
    await userEvent.click(screen.getByRole('button', { name: 'Tải thêm' }));
    expect(await screen.findByRole('link', { name: /Nguyễn Thị Thu Hương/ })).toHaveAttribute('href', '/exchange/conversations/room');
    expect(vi.mocked(source.list).mock.calls[1][0]).toEqual({ limit: 20, cursor: 'next' });
  });
  it('renders plain Unicode text safely and starts with a labelled three-line composer', async () => {
    const source = api(); const result = view(source, 'room');
    const log = await screen.findByRole('log');
    await waitFor(() => expect(log).toHaveTextContent('Xin chào 🌏'));
    expect(log).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(log.querySelector('img')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveAttribute('rows', '3');
    expect(screen.getByRole('link', { name: 'Xem hồ sơ' })).toHaveAttribute('href', '/exchange/profile/B');
    result.unmount();
  });
  it('preserves the draft and client ID on visible retry, then shows one persisted message', async () => {
    const source = api(); vi.mocked(source.send).mockRejectedValueOnce(new TypeError('offline'))
      .mockImplementationOnce(async (_id: string, input: SendMessageInput) => ({ ...message, ...input, id: 'sent', sequence: '2', senderUserId: 'A' }));
    view(source, 'room');
    const input = await screen.findByRole('textbox', { name: 'Tin nhắn' });
    await userEvent.type(input, 'Hello 🌏');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('Chưa xác nhận được tin nhắn. Thử gửi lại sẽ dùng cùng mã tin nhắn.');
    expect(input).toHaveValue('Hello 🌏');
    await userEvent.click(screen.getByRole('button', { name: 'Thử gửi lại' }));
    await waitFor(() => expect(screen.getAllByText('Hello 🌏')).toHaveLength(1));
    expect(vi.mocked(source.send).mock.calls[0][1]).toEqual(vi.mocked(source.send).mock.calls[1][1]);
    expect(input).toHaveValue('');
  });
  it('clears protected content and disables the composer when a current REST check is denied', async () => {
    const source = api(); view(source, 'room');
    await screen.findByRole('textbox', { name: 'Tin nhắn' });
    await screen.findByRole('link', { name: /Nguyễn Thị Thu Hương/ });
    vi.mocked(source.list).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(source.send).mockRejectedValueOnce(new ApiClientError('denied', 403, 'MESSAGE_UNAVAILABLE'));
    vi.mocked(source.get).mockRejectedValue(new ApiClientError('denied', 403, 'MESSAGE_UNAVAILABLE'));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tin nhắn' }), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('Hội thoại hiện không khả dụng. Kiểm tra lại kết nối với bạn học.');
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: /Nguyễn Thị Thu Hương/ })).not.toBeInTheDocument());
  });
});
