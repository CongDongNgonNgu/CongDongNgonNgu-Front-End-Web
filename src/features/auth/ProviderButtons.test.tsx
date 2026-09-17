import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthApi } from './auth-api';
import { AuthProvider } from './AuthProvider';
import { ProviderButtons } from './ProviderButtons';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderProviderButtons() {
  const api = new AuthApi();
  vi.spyOn(api, 'bootstrap').mockResolvedValue(null);
  vi.spyOn(api, 'getProviders').mockResolvedValue({
    providers: [{ name: 'google', enabled: true }],
  });
  const getOAuthStartUrl = vi.spyOn(api, 'getOAuthStartUrl').mockReturnValue('#oauth-start');

  render(
    <AuthProvider api={api}>
      <ProviderButtons />
    </AuthProvider>,
  );

  return { getOAuthStartUrl };
}

describe('ProviderButtons', () => {
  it('starts the unified Google OAuth flow from the login page', async () => {
    const user = userEvent.setup();
    const { getOAuthStartUrl } = renderProviderButtons();

    const button = await screen.findByRole('button', { name: /Google/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(getOAuthStartUrl).toHaveBeenCalledWith('google');
    expect(screen.getByText('Hoặc tiếp tục bằng')).toBeVisible();
  });

  it('starts the unified Google OAuth flow from the register page', async () => {
    const user = userEvent.setup();
    const { getOAuthStartUrl } = renderProviderButtons();

    const button = await screen.findByRole('button', { name: /Google/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(getOAuthStartUrl).toHaveBeenCalledWith('google');
    expect(screen.getByText('Hoặc tiếp tục bằng')).toBeVisible();
  });
});
