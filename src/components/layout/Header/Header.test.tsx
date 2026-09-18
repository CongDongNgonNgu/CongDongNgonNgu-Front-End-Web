import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../AppShell';
import { AuthApi } from '../../../features/auth/auth-api';
import { AuthProvider, useAuth } from '../../../features/auth/AuthProvider';
import type { AuthUser } from '../../../features/auth/auth.types';

afterEach(cleanup);

const authenticatedUser: AuthUser = {
  id: 'user-1',
  email: 'tan@example.com',
  displayName: 'Tan Trieu',
  status: 'ACTIVE',
  emailVerified: true,
  roles: ['MEMBER'],
};

function createAuthApi(): AuthApi {
  const api = new AuthApi();
  vi.spyOn(api, 'bootstrap').mockResolvedValue(authenticatedUser);
  vi.spyOn(api, 'getProviders').mockResolvedValue({ providers: [] });
  return api;
}

function AuthenticatedShell({ children }: { children?: ReactNode }) {
  const { status, user } = useAuth();
  return (
    <AppShell isAuthenticated={status === 'authenticated'} userDisplayName={user?.displayName}>
      {children}
    </AppShell>
  );
}

describe('authenticated header avatars', () => {
  it('uses the AuthProvider display name for desktop and mobile initials and labels', async () => {
    render(
      <MemoryRouter>
        <AuthProvider api={createAuthApi()}>
          <AuthenticatedShell />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getAllByLabelText('Tan Trieu')).toHaveLength(2));

    expect(screen.getAllByLabelText('Tan Trieu').map((avatar) => avatar.textContent)).toEqual(['TT', 'TT']);

    const accountButtons = screen.getAllByRole('button').filter((button) => button.getAttribute('aria-label')?.includes('Tan Trieu'));
    expect(accountButtons).toHaveLength(2);
    expect(accountButtons.every((button) => button.getAttribute('aria-label')?.includes('Tan Trieu'))).toBe(true);
  });

  it('uses a generic avatar name when the authenticated display name is missing', () => {
    render(
      <MemoryRouter>
        <AppShell isAuthenticated><p>Fallback</p></AppShell>
      </MemoryRouter>,
    );

    const fallbackAvatars = screen.getAllByLabelText('Thành viên');
    expect(fallbackAvatars).toHaveLength(2);
    expect(fallbackAvatars.every((avatar) => Boolean(avatar.textContent))).toBe(true);
  });
});
