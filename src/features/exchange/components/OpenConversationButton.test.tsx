import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OpenConversationButtonView } from './OpenConversationButton';

afterEach(cleanup);
describe('connected partner conversation entry', () => {
  it('opens the server-owned conversation ID and navigates to its native route', async () => {
    const api = { open: vi.fn().mockResolvedValue({ id: 'conversation', partner: { userId: 'B' } }) };
    render(<MemoryRouter><Routes><Route path='/' element={<OpenConversationButtonView api={api} actor='A' partnerUserId='B'/>}/>
      <Route path='/exchange/conversations/conversation' element={<p>Opened conversation</p>}/></Routes></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Nhắn tin' }));
    expect(await screen.findByText('Opened conversation')).toBeInTheDocument();
    expect(api.open).toHaveBeenCalledWith('B', expect.any(AbortSignal));
  });
  it('keeps the current page and shows safe retry feedback after authorization rejection', async () => {
    const api = { open: vi.fn().mockRejectedValue(new Error('private denial details')) };
    render(<MemoryRouter><OpenConversationButtonView api={api} actor='A' partnerUserId='B'/></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Nhắn tin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa mở được hội thoại. Hãy kiểm tra lại kết nối với bạn học.');
    expect(screen.queryByText('private denial details')).not.toBeInTheDocument();
  });
});
