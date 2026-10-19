import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Link } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { DropdownMenu } from './DropdownMenu';
afterEach(cleanup);
function Harness() {
  const [open, setOpen] = useState(false);
  return <MemoryRouter><button>Outside</button><DropdownMenu open={open} variant='navigation' label='Account' onToggle={() => setOpen(!open)} onClose={() => setOpen(false)}>
    <Link to='/community/groups'>My Groups</Link><Link to='/exchange/conversations'>Messages</Link>
  </DropdownMenu><button>After</button></MemoryRouter>;
}
describe('DropdownMenu disclosure keyboard and dismissal', () => {
  it('supports arrow navigation and Escape focus return', async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Account' });
    expect(trigger).not.toHaveAttribute('aria-haspopup');
    trigger.focus(); await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'My Groups' })).toHaveFocus();
    await user.keyboard('{ArrowUp}'); expect(screen.getByRole('link', { name: 'Messages' })).toHaveFocus();
    await user.keyboard('{Home}'); expect(screen.getByRole('link', { name: 'My Groups' })).toHaveFocus();
    await user.keyboard('{End}'); expect(screen.getByRole('link', { name: 'Messages' })).toHaveFocus();
    await user.keyboard('{Escape}'); expect(screen.queryByRole('region')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });
  it('dismisses on outside pointer, route selection and keyboard focus leaving', async () => {
    const user = userEvent.setup(); render(<Harness />); const trigger = screen.getByRole('button', { name: 'Account' });
    await user.click(trigger); await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    await user.click(trigger); await user.click(within(screen.getByRole('region')).getByRole('link', { name: 'Messages' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    await user.click(trigger); await user.tab(); await user.tab(); await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus(); expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
