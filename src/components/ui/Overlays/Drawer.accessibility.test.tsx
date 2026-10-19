import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Drawer } from './Drawer';
afterEach(cleanup);
function Harness() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  return <><button ref={trigger} onClick={() => setOpen(true)}>Open</button><button>Outside</button>
    <Drawer open={open} title='Menu' closeLabel='Close menu' onClose={() => setOpen(false)} initialFocusRef={close} returnFocusRef={trigger}>
      <a href='/community/groups'>My Groups</a><button>Last action</button>
    </Drawer></>;
}
describe('Drawer focus boundary', () => {
  it('wraps Tab both directions and recovers focus starting outside', async () => {
    render(<Harness />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }));
    const first = screen.getByRole('button', { name: 'Close menu' });
    const last = screen.getByRole('button', { name: 'Last action' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    screen.getByRole('button', { name: 'Outside' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
  });
  it('closes on Escape/backdrop and restores focus and body scrolling', async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(document.body).toHaveClass('drawer-open');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus(); expect(document.body).not.toHaveClass('drawer-open');
    await user.click(trigger);
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(trigger).toHaveFocus(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
