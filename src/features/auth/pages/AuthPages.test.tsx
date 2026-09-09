import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthApi } from '../auth-api';
import { AuthProvider, useAuth } from '../AuthProvider';
import type { AuthUser } from '../auth.types';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

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

    expect(screen.getByRole('heading', { name: 'Mừng bạn trở lại.' })).toBeVisible();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^Mật khẩu/)).toHaveAttribute('autocomplete', 'current-password');
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

    await user.type(screen.getByLabelText(/^Email/), 'learner@example.com');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'Correct horse battery staple');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
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

    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByLabelText(/^Email/)).toHaveFocus();
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
    await user.type(screen.getByLabelText(/^Email/), 'learner@example.com');
    await user.type(screen.getByLabelText(/^Mật khẩu/), 'Correct horse battery staple');
    await user.type(screen.getByLabelText(/^Nhập lại mật khẩu/), 'Different password 2026');
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Hai mật khẩu chưa khớp.');
    expect(register).not.toHaveBeenCalled();
  });
});
