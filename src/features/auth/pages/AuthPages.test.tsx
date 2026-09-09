import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthApi } from '../auth-api';
import { AuthProvider, useAuth } from '../AuthProvider';
import type { AuthUser } from '../auth.types';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { VerifyEmailPage } from './VerifyEmailPage';
import { AuthCallbackPage } from './AuthCallbackPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createApi(initialUser: AuthUser | null = null) {
  const api = new AuthApi();
  vi.spyOn(api, 'bootstrap').mockResolvedValue(initialUser);
  vi.spyOn(api, 'getProviders').mockResolvedValue({
    providers: [
      { name: 'google', enabled: false },
      { name: 'facebook', enabled: false },
      { name: 'zalo', enabled: false },
      { name: 'apple', enabled: false },
    ],
  });
  return api;
}

function AuthStatusProbe() {
  const { status, refresh, logout } = useAuth();
  return (
    <>
      <span data-testid='auth-status'>{status}</span>
      <button type='button' onClick={() => void refresh().catch(() => undefined)}>Refresh session</button>
      <button type='button' onClick={() => void logout().catch(() => undefined)}>Log out</button>
    </>
  );
}

describe('auth pages', () => {
  it('moves the auth boundary to unauthenticated after refresh failure', async () => {
    const user = userEvent.setup();
    const api = createApi({
      id: 'user-1',
      email: 'learner@example.com',
      displayName: 'Learner',
      status: 'ACTIVE',
      emailVerified: true,
      roles: ['MEMBER'],
    });
    vi.spyOn(api, 'refreshAccess').mockRejectedValue(new Error('expired'));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider api={api}>
          <AuthStatusProbe />
          <Routes><Route path='/login' element={<LoginPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated'));
    await user.click(screen.getByRole('button', { name: 'Refresh session' }));
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated'));
  });

  it('demotes local auth state when server logout fails', async () => {
    const user = userEvent.setup();
    const api = createApi({
      id: 'user-1',
      email: 'learner@example.com',
      displayName: 'Learner',
      status: 'ACTIVE',
      emailVerified: true,
      roles: ['MEMBER'],
    });
    vi.spyOn(api, 'logout').mockRejectedValue(new Error('network'));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider api={api}>
          <AuthStatusProbe />
          <Routes><Route path='/login' element={<LoginPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated'));
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated'));
  });

  it('renders labeled login controls and exposes disabled provider status', async () => {
    const api = createApi();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider api={api}>
          <Routes><Route path='/login' element={<LoginPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tiếp tục hành trình kết nối ngôn ngữ' })).toBeVisible();
    expect(screen.getByLabelText(/địa chỉ email/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^Mật khẩu/)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText(/Bằng việc đăng nhập/)).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: /Google/i })).toBeDisabled());
  });

  it('submits valid login and navigates to the public home route', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const login = vi.spyOn(api, 'login').mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        displayName: 'Learner',
        status: 'ACTIVE',
        emailVerified: true,
        roles: ['MEMBER'],
      },
      accessToken: 'access-token',
      expiresIn: 900,
    });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider api={api}>
          <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/' element={<p>Trang chủ kiểm thử</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/địa chỉ email/i), 'learner@example.com');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'Correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /Đăng nhập vào tài khoản/ }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({
      email: 'learner@example.com',
      password: 'Correct horse battery staple',
    }));
    await waitFor(() => expect(screen.getByText('Trang chủ kiểm thử')).toBeVisible());
  });

  it('returns keyboard focus to the first invalid login field', async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider api={api}>
          <Routes><Route path='/login' element={<LoginPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Đăng nhập vào tài khoản/ }));
    expect(screen.getByLabelText(/địa chỉ email/i)).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập email hợp lệ.');
  });

  it('blocks a registration with mismatched passwords before network submission', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const register = vi.spyOn(api, 'register');
    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider api={api}>
          <Routes><Route path='/register' element={<RegisterPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/^Tên hiển thị/), 'Người học');
    await user.type(screen.getByLabelText(/địa chỉ email/i), 'learner@example.com');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'Correct horse battery staple');
    await user.type(screen.getByLabelText(/^Xác nhận mật khẩu/), 'Different password 2026');
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản thành viên/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Hai mật khẩu chưa khớp.');
    expect(register).not.toHaveBeenCalled();
  });

  it('renders the canonical Login editorial hierarchy and trust copy', () => {
    const api = createApi();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider api={api}>
          <Routes><Route path='/login' element={<LoginPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tiếp tục hành trình kết nối ngôn ngữ' })).toBeVisible();
    expect(screen.getByText('Học tập cùng con người thực')).toBeVisible();
    expect(screen.getByText('Tài nguyên mở, vì cộng đồng')).toBeVisible();
    expect(screen.getByText('Tôn trọng và đồng cảm')).toBeVisible();
    expect(screen.getByText('Không gian học tập tôn trọng & an toàn')).toBeVisible();
  });

  it('renders the canonical Register information and consent hierarchy', () => {
    const api = createApi();
    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider api={api}>
          <Routes><Route path='/register' element={<RegisterPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Cùng nhau học hỏi, lưu giữ và lan tỏa ngôn ngữ' })).toBeVisible();
    expect(screen.getByText('Lưu ý xác thực hòm thư')).toBeVisible();
    expect(screen.getByText('Quy chuẩn mật khẩu dễ nhớ & an toàn:')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /Tôi đã đọc và đồng ý/i })).toBeVisible();
    expect(screen.getByText('Tôn trọng & bảo mật quyền riêng tư')).toBeVisible();
  });

  it('renders the canonical recovery request state and transitions to the safe sent state', async () => {
    const user = userEvent.setup();
    const api = createApi();
    vi.spyOn(api, 'forgotPassword').mockResolvedValue({ sent: true });
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <AuthProvider api={api}>
          <Routes><Route path='/forgot-password' element={<ForgotPasswordPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Khôi phục mật khẩu' })).toBeVisible();
    expect(screen.getByText('Bước 1/5')).toBeVisible();
    await user.type(screen.getByLabelText(/Địa chỉ email liên kết/i), 'learner@example.com');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết khôi phục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kiểm tra hòm thư của bạn' })).toBeVisible());
    expect(screen.getByText('Bước 2/5')).toBeVisible();
    expect(screen.getByRole('button', { name: /Gửi lại liên kết ngay/i })).toBeDisabled();
  });

  it('renders an expired reset link as a safe recovery state', () => {
    const api = createApi();
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <AuthProvider api={api}>
          <Routes><Route path='/reset-password' element={<ResetPasswordPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Liên kết đã hết hạn hoặc không hợp lệ' })).toBeVisible();
    expect(screen.getByText('Bước 4/5')).toBeVisible();
    expect(screen.getByRole('link', { name: /Yêu cầu liên kết mới/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('masks the verification email in the visible recovery UI', () => {
    const api = createApi();
    render(
      <MemoryRouter initialEntries={['/verify-email?email=learner@example.com']}>
        <AuthProvider api={api}>
          <Routes><Route path='/verify-email' element={<VerifyEmailPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Xác thực địa chỉ email để tiếp tục' })).toBeVisible();
    expect(screen.getByText('le***@example.com')).toBeVisible();
    expect(screen.queryByText('learner@example.com')).not.toBeInTheDocument();
  });

  it('renders OAuth collision recovery without exposing account details', () => {
    const api = createApi();
    const refreshAccess = vi.spyOn(api, 'refreshAccess');
    render(
      <MemoryRouter initialEntries={['/auth/callback?status=collision']}>
        <AuthProvider api={api}>
          <Routes><Route path='/auth/callback' element={<AuthCallbackPage />} /></Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Không thể liên kết tài khoản' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Hãy đăng nhập bằng email và mật khẩu');
    expect(screen.queryByText(/đã được đăng ký trước đó/i)).not.toBeInTheDocument();
    expect(refreshAccess).not.toHaveBeenCalled();
  });
});
