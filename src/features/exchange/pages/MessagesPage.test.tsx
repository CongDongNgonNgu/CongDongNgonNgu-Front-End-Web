import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { MessagesPageView } from './MessagesPage';
import type { MessageStreamOptions } from '../message-stream.client';
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { UI_LOCALE_STORAGE_KEY } from '../../ui-locale/ui-locale';
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

 describe('Phase29 inbox metadata', () => {
  it('shows the server update time and an accessible unread count on its canonical row', async () => {
    const result = view(api());
    const row = await screen.findByRole('link', { name: new RegExp(summary.partner.displayName) });
    expect(row.querySelector('time')).toHaveAttribute('datetime', summary.updatedAt);
    expect(row).toHaveAccessibleName(expect.stringContaining('1 tin ch\u01b0a \u0111\u1ecdc'));
    expect(row).toHaveAttribute('href', '/exchange/conversations/room');
    expect(result.container.querySelector('time')).toHaveTextContent(new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(summary.updatedAt)));
  });
  it('provides a learning-partner destination in the genuinely empty inbox', async () => {
    const source = api(); vi.mocked(source.list).mockResolvedValue({ items: [], nextCursor: null });
    view(source);
    await screen.findByText(/Ch\u01b0a c\u00f3 h\u1ed9i tho\u1ea1i\./);
    expect(screen.getAllByRole('link', { name: 'B\u1ea1n h\u1ecdc c\u1ee7a b\u1ea1n' })).toHaveLength(2);
  });
 });

describe('Phase29 thread feedback', () => {
  it('describes a failed live stream truthfully while REST messages remain usable', async () => {
    const source = api();
    render(<MemoryRouter><MessagesPageView api={source} actor='A' conversationId='room' streamAuth={session}
      streamClient={{ connect: vi.fn().mockRejectedValue(new TypeError('stream interrupted')) }}/></MemoryRouter>);
    await screen.findByText('C\u1eadp nh\u1eadt tr\u1ef1c ti\u1ebfp b\u1ecb gi\u00e1n \u0111o\u1ea1n. V\u1eabn \u0111ang ki\u1ec3m tra tin nh\u1eafn \u0111\u1ecbnh k\u1ef3.');
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(screen.queryByText(/Ngo\u1ea1i tuy\u1ebfn/)).not.toBeInTheDocument();
  });
  it('keeps Enter as a newline and provides a learning-oriented first-message prompt', async () => {
    const source = api(); vi.mocked(source.get).mockResolvedValue({ ...summary, headSequence: '0', unreadCount: '0' });
    vi.mocked(source.history).mockResolvedValue({ items: [], nextCursor: null, beforeCursor: 'before', afterCursor: 'after' });
    view(source, 'room');
    const input = await screen.findByRole('textbox');
    await userEvent.type(input, 'Hello{enter}Xin chao');
    expect(input).toHaveValue('Hello\nXin chao');
    expect(source.send).not.toHaveBeenCalled();
    expect(screen.getByText('B\u1ea1n mu\u1ed1n luy\u1ec7n g\u00ec h\u00f4m nay?')).toBeInTheDocument();
  });
});

describe('Phase29 authorized pair information', () => {
  it('shows only the current pair with ordinary profile and connection links, then returns focus on Escape', async () => {
    const source = api(); view(source, 'room');
    const trigger = await screen.findByRole('button', { name: 'Th\u00f4ng tin h\u1ed9i tho\u1ea1i' });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(summary.partner.displayName)).toBeInTheDocument();
    expect(within(dialog).getByText('B\u1ea1n')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Xem h\u1ed3 s\u01a1' })).toHaveAttribute('href', '/exchange/profile/B');
    expect(within(dialog).getByRole('link', { name: 'B\u1ea1n h\u1ecdc c\u1ee7a b\u1ea1n' })).toHaveAttribute('href', '/exchange/connections');
    expect(within(dialog).queryByRole('button', { name: /Th\u00eam|X\u00f3a|B\u00e1o c\u00e1o/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });
  it('disposes an open information dialog immediately after protected access is denied', async () => {
    const source = api(); let options!: MessageStreamOptions;
    const client = { connect: vi.fn((next: MessageStreamOptions) => { options = next; return new Promise<void>(() => undefined); }) };
    render(<MemoryRouter><MessagesPageView api={source} actor='A' conversationId='room' streamAuth={session} streamClient={client}/></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Th\u00f4ng tin h\u1ed9i tho\u1ea1i' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    vi.mocked(source.get).mockRejectedValue(new ApiClientError('denied', 404, 'MESSAGE_UNAVAILABLE'));
    await act(async () => { options.onHint('2'); });
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Th\u00f4ng tin h\u1ed9i tho\u1ea1i' })).not.toBeInTheDocument();
  });
  it('clears an open pair dialog on route/actor change and ignores an old late summary', async () => {
    const source = api(); const result = view(source, 'room');
    await userEvent.click(await screen.findByRole('button', { name: 'Th\u00f4ng tin h\u1ed9i tho\u1ea1i' }));
    let finish!: (value: DirectConversationSummary) => void;
    vi.mocked(source.get).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    result.rerender(<MemoryRouter><MessagesPageView api={source} actor='A' conversationId='other' streamAuth={session} streamClient={stream}/></MemoryRouter>);
    await waitFor(() => expect(source.get).toHaveBeenCalledWith('other', expect.any(AbortSignal)));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    result.rerender(<MemoryRouter><MessagesPageView api={source} actor='C' streamAuth={session} streamClient={stream}/></MemoryRouter>);
    finish({ ...summary, id: 'other' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });
});

it('localizes inbox metadata and current-pair information in English', async () => {
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, 'en');
  try {
    render(<UiLocaleProvider><MemoryRouter><MessagesPageView api={api()} actor='A' actorName='Linh Nguyen' conversationId='room' streamAuth={session} streamClient={stream}/></MemoryRouter></UiLocaleProvider>);
    await userEvent.click(await screen.findByRole('button', { name: 'Conversation information' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Linh Nguyen')).toBeInTheDocument();
    expect(within(dialog).getByText('You')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Your learning partners' })).toHaveAttribute('href', '/exchange/connections');
    expect(screen.getByText(/^Updated /)).toBeInTheDocument();
  } finally { localStorage.removeItem(UI_LOCALE_STORAGE_KEY); }
});
