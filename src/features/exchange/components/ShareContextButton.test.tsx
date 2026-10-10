import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShareContextButton, ShareContextButtonView } from './ShareContextButton';
import type { ContextShareApi } from '../hooks/use-context-share';

vi.mock('../../auth/AuthProvider', () => ({ useOptionalAuth: () => null }));
afterEach(cleanup);
const reference = { type: 'LIBRARY_RESOURCE' as const, id: 'eb52692c-752c-4627-aa43-745927171d6a' };
const fixture = (): ContextShareApi => ({ listConnections: vi.fn().mockResolvedValue({ items: [], nextCursor: null }), open: vi.fn(), send: vi.fn() });
describe('authenticated context share entry', () => {
  it('keeps guest pages free of private partner loading', () => {
    render(<MemoryRouter><ShareContextButton reference={reference}/></MemoryRouter>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('opens the native dialog on demand and masks it across A/B/A and source changes', async () => {
    const api = fixture();const view = render(<MemoryRouter><ShareContextButtonView api={api} actor='A' reference={reference}/></MemoryRouter>);
    expect(api.listConnections).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ với bạn học' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');expect(screen.getByRole('button', { name: 'Chia sẻ với bạn học' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ với bạn học' }));
    view.rerender(<MemoryRouter><ShareContextButtonView api={api} actor='B' reference={reference}/></MemoryRouter>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<MemoryRouter><ShareContextButtonView api={api} actor='A' reference={reference}/></MemoryRouter>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ với bạn học' }));
    view.rerender(<MemoryRouter><ShareContextButtonView api={api} actor='A' reference={{ ...reference, id: 'ee7b81f5-c07b-4e3e-a75b-06d0572ba4e1' }}/></MemoryRouter>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
