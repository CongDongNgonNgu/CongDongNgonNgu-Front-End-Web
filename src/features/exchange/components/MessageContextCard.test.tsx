import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { StrictMode } from 'react';
import { useMessageContexts } from '../hooks/use-message-contexts';
import { MessageContextCard } from './MessageContextCard';
import type { MessageContextApi, MessageContextProjection } from '../messaging.types';

afterEach(() => { cleanup();vi.useRealTimers();vi.unstubAllGlobals(); });
const resourceId = 'eb52692c-752c-4627-aa43-745927171d6a';
const available: MessageContextProjection = { messageId: 'message', context: {
  availability: 'AVAILABLE', type: 'LIBRARY_RESOURCE', id: resourceId, category: 'VOCABULARY',
  languageCode: 'en', previewText: '<img src=x onerror=alert(1)> Current word', canonicalPath: '/library/' + resourceId,
} };
function Location() { return <output data-testid='location'>{useLocation().pathname}</output>; }
function Harness({ api, actor = 'A', room = 'room', refreshing = false }: {
  api: MessageContextApi; actor?: string; room?: string; refreshing?: boolean;
}) {
  const queue = useMessageContexts(api, room, actor, refreshing);
  return <><MessageContextCard queue={queue} messageId='message'/><Location/></>;
}
const mount = (api: MessageContextApi) => render(<MemoryRouter><Harness api={api}/></MemoryRouter>);

describe('current message context UI', () => {
  it('escapes current text and opens only a freshly reauthorized canonical destination', async () => {
    const api = { context: vi.fn().mockResolvedValue(available) };const view = mount(api);
    await screen.findByText(available.context!.availability === 'AVAILABLE' ? available.context!.previewText : '');
    expect(view.container.querySelector('img')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mở nội dung' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library/' + resourceId));
    expect(api.context).toHaveBeenCalledTimes(2);
  });
  it('removes stale preview before focus refresh and keeps it masked after a failed request', async () => {
    let reject!: (reason: Error) => void;
    const api = { context: vi.fn().mockResolvedValueOnce(available)
      .mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; })) };
    mount(api);await screen.findByRole('button', { name: 'Mở nội dung' });
    fireEvent.focus(window);
    expect(screen.queryByText(/Current word/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mở nội dung' })).not.toBeInTheDocument();
    await act(async () => reject(new Error('offline')));
    expect(screen.getByText('Nội dung không còn khả dụng')).toBeInTheDocument();
  });
  it('denies click after target revocation and never navigates using the old card', async () => {
    const api = { context: vi.fn().mockResolvedValueOnce(available)
      .mockResolvedValue({ messageId: 'message', context: { availability: 'UNAVAILABLE' } }) };
    mount(api);await userEvent.click(await screen.findByRole('button', { name: 'Mở nội dung' }));
    await screen.findByText('Nội dung không còn khả dụng');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(screen.queryByText(/Current word/)).not.toBeInTheDocument();
  });
  it('rejects unexpected paths even when a response says available', async () => {
    const context = { ...available.context, canonicalPath: 'https://evil.invalid' };
    const api = { context: vi.fn().mockResolvedValue({ ...available, context }) };
    mount(api);await waitFor(() => expect(api.context).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Mở nội dung' })).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });
  it('ignores a late A response after A/B/A lifetimes and masks on REST reconciliation', async () => {
    let finish!: (value: MessageContextProjection) => void;
    const api = { context: vi.fn().mockImplementationOnce(() => new Promise(done => { finish = done; }))
      .mockResolvedValue({ messageId: 'message', context: { availability: 'UNAVAILABLE' } }) };
    const view = mount(api);await waitFor(() => expect(api.context).toHaveBeenCalledTimes(1));
    const signal = api.context.mock.calls[0][2] as AbortSignal;
    view.rerender(<MemoryRouter><Harness api={api} actor='B'/></MemoryRouter>);
    expect(signal.aborted).toBe(true);
    view.rerender(<MemoryRouter><Harness api={api} actor='A'/></MemoryRouter>);
    await act(async () => finish(available));
    expect(screen.queryByText(/Current word/)).not.toBeInTheDocument();
    api.context.mockResolvedValue(available);
    view.rerender(<MemoryRouter><Harness api={api} actor='A' refreshing/></MemoryRouter>);
    await screen.findByRole('button', { name: 'Mở nội dung' });
  });

  it('expires visible cards every thirty seconds and remains usable under StrictMode', async () => {
    vi.useFakeTimers();
    const api = { context: vi.fn().mockResolvedValue(available) };
    render(<StrictMode><MemoryRouter><Harness api={api}/></MemoryRouter></StrictMode>);
    await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); });
    expect(screen.getByRole('button', { name: 'Mở nội dung' })).toBeInTheDocument();
    api.context.mockResolvedValue({ messageId: 'message', context: { availability: 'UNAVAILABLE' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByText(/Current word/)).not.toBeInTheDocument();
    expect(screen.getByText('Nội dung không còn khả dụng')).toBeInTheDocument();
  });

  it('keeps older offscreen cards masked until observed again', async () => {
    let intersect!: (entries: { isIntersecting: boolean }[]) => void;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof intersect) { intersect = callback; }
      observe() {} disconnect() {}
    });
    const api = { context: vi.fn().mockResolvedValue(available) };
    mount(api);expect(api.context).not.toHaveBeenCalled();
    await act(async () => intersect([{ isIntersecting: true }]));
    await screen.findByRole('button', { name: 'Mở nội dung' });
    act(() => intersect([{ isIntersecting: false }]));fireEvent.focus(window);
    expect(screen.queryByText(/Current word/)).not.toBeInTheDocument();expect(api.context).toHaveBeenCalledTimes(1);
    api.context.mockResolvedValue({ messageId: 'message', context: { availability: 'UNAVAILABLE' } });
    await act(async () => intersect([{ isIntersecting: true }]));
    expect(screen.getByText('Nội dung không còn khả dụng')).toBeInTheDocument();
    expect(api.context).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard focus on the card when refresh removes its focused action', async () => {
    const api = { context: vi.fn().mockResolvedValueOnce(available)
      .mockResolvedValue({ messageId: 'message', context: { availability: 'UNAVAILABLE' } }) };
    mount(api);const button = await screen.findByRole('button', { name: 'Mở nội dung' });
    button.focus();fireEvent.focus(window);
    await screen.findByText('Nội dung không còn khả dụng');
    expect(document.activeElement).toBe(screen.getByText('Nội dung không còn khả dụng').parentElement);
  });
});
