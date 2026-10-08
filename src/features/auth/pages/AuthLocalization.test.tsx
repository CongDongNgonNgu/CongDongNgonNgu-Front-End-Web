import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { UiLocaleProvider, useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { AuthProvider } from '../AuthProvider';
import { AuthApi } from '../auth-api';
import { ApiClientError } from '../../../services/api-client';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { VerifyEmailPage } from './VerifyEmailPage';
import { AuthCallbackPage } from './AuthCallbackPage';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
function LocaleProbe() {
  const { setLocale } = useUiLocale();
  const location = useLocation();
  return <><button onClick={() => setLocale('en')}>English</button><button onClick={() => setLocale('vi')}>Vietnamese</button><span data-testid='route'>{location.pathname}{location.search}</span></>;
}
function setup(page: ReactNode, route: string) {
  localStorage.clear();
  const api = new AuthApi();
  vi.spyOn(api, 'bootstrap').mockResolvedValue(null);
  vi.spyOn(api, 'getProviders').mockResolvedValue({ providers: [{ name: 'google', enabled: false }] });
  render(<MemoryRouter initialEntries={[route]}><UiLocaleProvider><AuthProvider api={api}><LocaleProbe />{page}</AuthProvider></UiLocaleProvider></MemoryRouter>);
  return { api, user: userEvent.setup() };
}
describe('auth locale switching without restarting the journey', () => {
  it('preserves login values, remember selection, password visibility and route', async () => {
    const { user } = setup(<LoginPage />, '/login?entry=exchange');
    await user.type(screen.getByLabelText(/Địa chỉ email/), 'learner@example.test');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'private password');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Hiện' }));
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByLabelText(/Email address/)).toHaveValue('learner@example.test');
    expect(screen.getByLabelText(/^Password/)).toHaveValue('private password');
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('type', 'text');
    expect(screen.getByRole('checkbox', { name: /Remember sign-in/ })).toBeChecked();
    expect(screen.getByRole('button', { name: /Google/ })).toBeDisabled();
    expect(screen.getByText('Community guidelines')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('route')).toHaveTextContent('/login?entry=exchange');
    await user.click(screen.getByRole('button', { name: 'Vietnamese' }));
    expect(screen.getByLabelText(/^Mật khẩu/)).toHaveValue('private password');
  });
  it('shows and translates invalid email errors even when the address contains @ and password is filled', async () => {
    const { user, api } = setup(<LoginPage />, '/login');
    const login = vi.spyOn(api, 'login');
    await user.type(screen.getByLabelText(/Địa chỉ email/), 'foo@bar');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'password');
    await user.click(screen.getByRole('button', { name: /Đăng nhập vào tài khoản/ }));
    expect(screen.getByLabelText(/Địa chỉ email/)).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập email hợp lệ.');
    expect(screen.getByLabelText(/Địa chỉ email/)).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(login).not.toHaveBeenCalled();
  });
  it('preserves registration consent and values while translating an existing validation error', async () => {
    const { user, api } = setup(<RegisterPage />, '/register');
    const register = vi.spyOn(api, 'register');
    await user.type(screen.getByLabelText(/^Tên hiển thị/), 'Member');
    await user.type(screen.getByLabelText(/Địa chỉ email/), 'learner@example.test');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'password 123');
    await user.type(screen.getByLabelText(/^Xác nhận mật khẩu/), 'different 123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản thành viên/ }));
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The passwords do not match.');
    expect(screen.getByLabelText(/Public display name/)).toHaveValue('Member');
    expect(screen.getByLabelText(/^Confirm password/)).toHaveValue('different 123');
    expect(screen.getByRole('checkbox', { name: /I have read and agree/ })).toBeChecked();
    expect(register).not.toHaveBeenCalled();
  });
  it('updates a displayed safe API error with locale without resubmitting', async () => {
    const { user, api } = setup(<LoginPage />, '/login');
    const login = vi.spyOn(api, 'login').mockRejectedValue(new ApiClientError('secret SQL token', 400, 'UNKNOWN'));
    await user.type(screen.getByLabelText(/Địa chỉ email/), 'learner@example.test');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'password');
    await user.click(screen.getByRole('button', { name: /Đăng nhập vào tài khoản/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Có lỗi xảy ra.'));
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again later.');
    expect(screen.queryByText(/secret SQL token/)).not.toBeInTheDocument();
    expect(login).toHaveBeenCalledOnce();
  });
  it('keeps recovery sent state and translates the step without repeating a request', async () => {
    const { user, api } = setup(<ForgotPasswordPage />, '/forgot-password');
    const forgot = vi.spyOn(api, 'forgotPassword').mockResolvedValue({ sent: true });
    await user.type(screen.getByLabelText(/Địa chỉ email liên kết/), 'learner@example.test');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết khôi phục/ }));
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    expect(screen.getByText('Step 2/5')).toBeVisible();
    expect(screen.getByText('2. Sent')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Password recovery status' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Resend link now' })).toBeDisabled();
    expect(forgot).toHaveBeenCalledOnce();
  });
  it('keeps the verified state and does not replay token verification', async () => {
    const api = new AuthApi();
    vi.spyOn(api, 'bootstrap').mockResolvedValue(null);
    vi.spyOn(api, 'getProviders').mockResolvedValue({ providers: [] });
    const verify = vi.spyOn(api, 'verifyEmail').mockResolvedValue({ verified: true });
    render(<MemoryRouter initialEntries={['/verify-email?token=opaque']}><UiLocaleProvider><AuthProvider api={api}><LocaleProbe /><VerifyEmailPage /></AuthProvider></UiLocaleProvider></MemoryRouter>);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Email đã được xác minh' })).toBeVisible());
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('status')).toHaveTextContent('Your email has been verified.');
    expect(screen.getByTestId('route')).toHaveTextContent('/verify-email?token=opaque');
    expect(verify).toHaveBeenCalledOnce();
  });
  it('preserves reset values and localizes the existing 12-character validation', async () => {
    const { user, api } = setup(<ResetPasswordPage />, '/reset-password?token=opaque');
    const reset = vi.spyOn(api, 'resetPassword');
    await user.type(screen.getByLabelText(/^Mật khẩu mới/), 'shortpass');
    await user.type(screen.getByLabelText(/^Xác nhận mật khẩu mới/), 'shortpass');
    await user.click(screen.getByRole('button', { name: /Lưu mật khẩu mới/ }));
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByLabelText(/^New password/)).toHaveValue('shortpass');
    expect(screen.getByLabelText(/^Confirm new password/)).toHaveValue('shortpass');
    expect(screen.getByRole('alert')).toHaveTextContent('Your password must contain at least 12 characters.');
    expect(screen.getByText('At least 12 characters.')).toBeVisible();
    expect(screen.getByTestId('route')).toHaveTextContent('/reset-password?token=opaque');
    expect(reset).not.toHaveBeenCalled();
  });
  it('translates invalid reset and OAuth collision recovery with canonical routes', async () => {
    const { user } = setup(<><ResetPasswordPage /><AuthCallbackPage /></>, '/auth/callback?status=collision');
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { name: 'The link is expired or invalid' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Request a new link →' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('heading', { name: 'Could not link accounts' })).toBeVisible();
    expect(screen.getByText(/Sign in with your existing email and password/)).toBeVisible();
  });
});
