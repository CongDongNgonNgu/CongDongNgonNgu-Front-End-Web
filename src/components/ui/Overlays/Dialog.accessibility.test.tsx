import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { Dialog } from './Dialog';

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <Dialog open={open} title='Dialog test' onClose={() => setOpen(false)}>
        <button>First action</button>
        <button>Last action</button>
      </Dialog>
    </>
  );
}

describe('Dialog accessibility behavior', () => {
  it('traps reverse tab at the first control and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(trigger);
    const close = screen.getByRole('button', { name: 'Đóng hộp thoại' });
    const last = screen.getByRole('button', { name: 'Last action' });
    last.focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(close).toHaveFocus();

    await user.click(close);
    expect(trigger).toHaveFocus();
  });
});
