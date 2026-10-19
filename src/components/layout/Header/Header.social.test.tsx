
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { Header } from './Header';
import { UiLocaleProvider } from '../../../features/ui-locale/UiLocaleProvider';
import { UI_LOCALE_STORAGE_KEY } from '../../../features/ui-locale/ui-locale';

afterEach(() => { cleanup(); localStorage.clear(); });
function RouteAction() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/community/groups/invitations?from=nav#accept')}>Change route</button>;
}
function view(authenticated = true, locale = 'vi') {
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  return render(<MemoryRouter initialEntries={['/exchange/conversations/room']}><UiLocaleProvider>
    <Header isAuthenticated={authenticated} userDisplayName='Tan Trieu'/><RouteAction/>
  </UiLocaleProvider></MemoryRouter>);
}
describe('social shell navigation', () => {
  it.each([
    ['vi', 'Nhóm của tôi', 'Tin nhắn', 'Điều hướng chính', 'Điều hướng nhanh'],
    ['en', 'My Groups', 'Messages', 'Primary navigation', 'Quick navigation'],
  ])('promotes private task entries consistently in %s', (locale, groups, messages, primary, quick) => {
    view(true, locale);
    for (const name of [primary, quick]) {
      const navigation = screen.getByRole('navigation', { name });
      expect(within(navigation).getByRole('link', { name: groups })).toHaveAttribute('href', '/community/groups');
      expect(within(navigation).getByRole('link', { name: messages })).toHaveAttribute('aria-current', 'page');
      expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    }
  });
  it('retains guest discovery without private quick links', () => {
    view(false, 'en');
    expect(screen.queryByRole('link', { name: 'My Groups' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Messages' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Quick navigation' })).getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });
  it('provides account shortcuts and closes on outside, Escape and route change', async () => {
    const user = userEvent.setup(); view(true, 'en');
    const trigger = screen.getByRole('button', { name: 'Tan Trieu Account' });
    await user.click(trigger);
    expect(within(screen.getByRole('region', { name: 'Account' })).getByRole('link', { name: 'My Groups' })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('region', { name: 'Account' })).not.toBeInTheDocument();
    await user.click(trigger); await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    await user.click(trigger); await user.click(screen.getByRole('button', { name: 'Change route' }));
    expect(screen.queryByRole('region', { name: 'Account' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', { name: 'My Groups' })).toHaveAttribute('aria-current', 'page');
  });
  it('dismisses private overlays when authentication changes', async () => {
    const user = userEvent.setup();
    const result = render(<MemoryRouter><Header isAuthenticated userDisplayName='Tan Trieu'/></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Tan Trieu Tài khoản' }));
    expect(screen.getByRole('region', { name: 'Tài khoản' })).toBeInTheDocument();
    result.rerender(<MemoryRouter><Header isAuthenticated={false}/></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Tài khoản' })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Mở menu' })[0]);
    expect(screen.queryByRole('link', { name: 'Nhóm của tôi' })).not.toBeInTheDocument();
  });
});

describe('mobile social drawer', () => {
  it('opens authenticated task destinations and closes after choosing one', async () => {
    const user = userEvent.setup(); view(true, 'en');
    await user.click(screen.getAllByRole('button', { name: 'Open menu' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(dialog).getByRole('link', { name: 'My Groups' })).toHaveAttribute('href', '/community/groups');
    await user.click(within(dialog).getByRole('link', { name: 'Messages' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});

describe('shell identity boundaries', () => {
  it('closes the mobile drawer after the signed-in identity changes', async () => {
    const user = userEvent.setup();
    const result = render(<MemoryRouter><Header isAuthenticated userDisplayName='First Actor'/></MemoryRouter>);
    await user.click(screen.getAllByRole('button', { name: 'Mở menu' })[0]);
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    result.rerender(<MemoryRouter><Header isAuthenticated userDisplayName='Second Actor'/></MemoryRouter>);
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});
