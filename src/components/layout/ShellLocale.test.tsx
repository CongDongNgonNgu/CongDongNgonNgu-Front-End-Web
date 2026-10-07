import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { UiLocaleProvider } from '../../features/ui-locale/UiLocaleProvider';
import { AppShell } from './AppShell';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid='route'>{location.pathname}{location.search}{location.hash}</output><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button></>;
}

function renderShell() {
  return render(<UiLocaleProvider><MemoryRouter initialEntries={['/community', '/library?language=fr#results']}><AppShell><Probe /></AppShell></MemoryRouter></UiLocaleProvider>);
}

describe('bounded shell UI locale', () => {
  it('localizes the footer and makes its locale control change the shared preference', async () => {
    const user = userEvent.setup();
    renderShell();
    const footer = screen.getByRole('contentinfo');
    await user.selectOptions(within(footer).getByRole('combobox', { name: 'Ngôn ngữ giao diện' }), 'en');
    expect(within(footer).getByRole('navigation', { name: 'Footer links' })).toHaveTextContent('Privacy');
    expect(within(footer).getByText('Learn and share languages together, with curiosity and respect for our differences.')).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Find a study partner' })).toHaveAttribute('href', '/exchange');
    expect(within(footer).getByRole('button', { name: 'Share CongDongNgonNgu.vn' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  });

  it('switches shell labels without changing route, content-language filter or browser history', async () => {
    const user = userEvent.setup();
    renderShell();
    const selector = screen.getAllByRole('combobox', { name: 'Ngôn ngữ giao diện' })[0];
    selector.focus();
    await user.selectOptions(selector, 'en');
    expect(selector).toHaveFocus();
    expect(selector).toHaveValue('en');
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveTextContent('Explore');
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');
    expect(screen.getByTestId('route')).toHaveTextContent('/library?language=fr#results');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('route')).toHaveTextContent('/community');
    await user.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByTestId('route')).toHaveTextContent('/library?language=fr#results');
    await user.selectOptions(selector, 'vi');
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveTextContent('Khám phá');
  });

  it('keeps the mobile drawer open and focused while changing language, then restores trigger focus', async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getAllByRole('button', { name: 'Mở menu' })[0];
    await user.click(trigger);
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    const selector = within(drawer).getByRole('combobox', { name: 'Ngôn ngữ giao diện' });
    await user.selectOptions(selector, 'en');
    expect(selector).toHaveFocus();
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');
    expect(within(drawer).getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('localizes search feedback and preserves plain text interpolation', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Ngôn ngữ giao diện' })[0], 'en');
    await user.click(screen.getAllByRole('button', { name: 'Search' })[0]);
    await user.type(screen.getByPlaceholderText('Search the community'), '<img src=x>');
    await user.click(screen.getByRole('button', { name: 'Find' }));
    const feedback = screen.getByText('Search term received: “<img src=x>”.');
    expect(feedback).toHaveAttribute('role', 'status');
    expect(feedback.querySelector('img')).toBeNull();
  });

  it('persists English for a new mount and synchronizes all UI locale controls', async () => {
    const user = userEvent.setup();
    const first = renderShell();
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Ngôn ngữ giao diện' })[0], 'en');
    expect(screen.getAllByRole('combobox', { name: 'Interface language' }).every((control) => (control as HTMLSelectElement).value === 'en')).toBe(true);
    first.unmount();
    renderShell();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'en');
  });

  it('retains authenticated account links and the existing logout action when switching UI language', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<UiLocaleProvider><MemoryRouter initialEntries={['/library']}><AppShell isAuthenticated userDisplayName='Test Member' onLogout={onLogout}><Probe /></AppShell></MemoryRouter></UiLocaleProvider>);
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Ngôn ngữ giao diện' })[0], 'en');
    await user.click(screen.getByRole('button', { name: /Test Member Account/ }));
    expect(screen.getByRole('menuitem', { name: 'Language passport' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('menuitem', { name: 'Membership' })).toHaveAttribute('href', '/membership');
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.getByTestId('route')).toHaveTextContent('/library');
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('relocalizes an existing search announcement without interpreting query text as a state marker', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getAllByRole('button', { name: 'Tìm kiếm' })[0]);
    await user.type(screen.getByPlaceholderText('Tìm kiếm trong cộng đồng'), '__EMPTY__');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(screen.getByText('Đã nhận từ khóa “__EMPTY__”.')).toBeInTheDocument();
    await user.selectOptions(screen.getAllByRole('combobox', { name: 'Ngôn ngữ giao diện' })[0], 'en');
    expect(screen.getByText('Search term received: “__EMPTY__”.')).toBeInTheDocument();
  });
});
