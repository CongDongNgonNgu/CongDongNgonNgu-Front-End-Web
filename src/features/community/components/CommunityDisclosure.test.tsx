import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { CommunityDisclosure } from './CommunityDisclosure';
afterEach(cleanup);
it('exposes native expansion state and a canonical hidden chevron', async () => {
  const user=userEvent.setup();
  render(<CommunityDisclosure title='Learning context'><p>Context details</p></CommunityDisclosure>);
  const summary=screen.getByText('Learning context').closest('summary')!;
  expect(summary).toHaveAttribute('aria-expanded','false');
  expect(summary.querySelector('svg')).toHaveAttribute('aria-hidden','true');
  await user.click(summary);
  await waitFor(()=>expect(summary).toHaveAttribute('aria-expanded','true'));
  expect(summary.closest('details')).toHaveAttribute('open');
});
