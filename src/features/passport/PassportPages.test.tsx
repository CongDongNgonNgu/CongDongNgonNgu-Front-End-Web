import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthApi } from '../auth/auth-api';
import { AuthProvider } from '../auth/AuthProvider';
import type { AuthUser } from '../auth/auth.types';
import type { LanguageCatalogItem, OwnProfile } from '../onboarding/onboarding.types';
import { OwnPassportPage, PublicPassportPage } from './PassportPages';
import type { PassportApi, PublicProfile } from './passport.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const user: AuthUser = {
  id: 'user-1',
  email: 'private@example.com',
  displayName: 'Linh Nguyễn',
  status: 'ACTIVE',
  emailVerified: true,
  roles: ['MEMBER'],
};

const catalog: LanguageCatalogItem[] = [
  { code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr', active: true, launch: true, sortOrder: 10 },
  { code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', direction: 'ltr', active: true, launch: true, sortOrder: 20 },
  { code: 'ja', slug: 'japanese', nativeName: '日本語', englishName: 'Japanese', vietnameseName: 'Tiếng Nhật', direction: 'ltr', active: true, launch: true, sortOrder: 30 },
];

const ownProfile: OwnProfile = {
  scope: 'own',
  user,
  languages: [
    {
      code: 'vi',
      slug: 'vietnamese',
      nativeName: 'Tiếng Việt',
      englishName: 'Vietnamese',
      vietnameseName: 'Tiếng Việt',
      direction: 'ltr',
      roles: ['native'],
      declaredProficiency: 'NATIVE',
      assessedProficiency: null,
      isPrimaryLearningTarget: false,
      visibility: 'PUBLIC',
    },
    {
      code: 'en',
      slug: 'english',
      nativeName: 'English',
      englishName: 'English',
      vietnameseName: 'Tiếng Anh',
      direction: 'ltr',
      roles: ['learning'],
      declaredProficiency: 'B1',
      assessedProficiency: null,
      isPrimaryLearningTarget: true,
      visibility: 'PRIVATE',
    },
  ],
  goals: ['conversation'],
  skills: ['speaking'],
  interests: ['music'],
  timezone: 'Asia/Ho_Chi_Minh',
  availability: [{ dayOfWeek: 2, startTime: '19:00', endTime: '20:00' }],
};

const publicProfile: PublicProfile = {
  scope: 'public',
  user: { id: 'user-2', displayName: 'Aiko 日本語' },
  languages: [{
    code: 'ja',
    slug: 'japanese',
    nativeName: '日本語',
    englishName: 'Japanese',
    vietnameseName: 'Tiếng Nhật',
    direction: 'ltr',
    roles: ['learning'],
    declaredProficiency: 'A2',
    assessedProficiency: null,
    isPrimaryLearningTarget: true,
  }],
  goals: ['community'],
  skills: ['listening'],
  interests: ['books'],
};

function createAuthApi(): AuthApi {
  const api = new AuthApi();
  vi.spyOn(api, 'bootstrap').mockResolvedValue(user);
  vi.spyOn(api, 'getProviders').mockResolvedValue({ providers: [] });
  return api;
}

function renderWithAuth(ui: ReactNode, authApi = createAuthApi()) {
  return render(<AuthProvider api={authApi}>{ui}</AuthProvider>);
}

describe('Passport pages', () => {
  it('renders the own passport and saves Phase 03 privacy changes without a body user id', async () => {
    const ui = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue(ownProfile);
    const api: PassportApi = {
      getLanguages: vi.fn().mockResolvedValue(catalog),
      getProfile: vi.fn().mockResolvedValue(ownProfile),
      updateProfile,
      getPublicProfile: vi.fn(),
    };
    renderWithAuth(<MemoryRouter initialEntries={['/profile']}><OwnPassportPage api={api} userId='user-1' /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Linh Nguyễn' })).toBeVisible();
    expect(screen.getByText('Việt Nam (UTC+07:00)')).toBeVisible();
    await ui.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
    await ui.selectOptions(screen.getAllByLabelText('Hiển thị trên hồ sơ')[0], 'PRIVATE');
    await ui.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    const payload = updateProfile.mock.calls[0][0];
    expect(payload).not.toHaveProperty('userId');
    expect(payload.languages).toEqual(expect.arrayContaining([
      expect.objectContaining({ languageCode: 'vi', visibility: 'PRIVATE' }),
      expect.objectContaining({ languageCode: 'en', visibility: 'PRIVATE' }),
    ]));
  });

  it('renders only the public projection and never mounts private controls or fields', async () => {
    const api: Pick<PassportApi, 'getPublicProfile'> = {
      getPublicProfile: vi.fn().mockResolvedValue(publicProfile),
    };
    renderWithAuth(
      <MemoryRouter initialEntries={['/profiles/user-2']}>
        <Routes><Route path='/profiles/:userId' element={<PublicPassportPage api={api} />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Aiko 日本語' })).toBeVisible();
    expect(screen.getByText('日本語')).toBeVisible();
    expect(screen.queryByText('private@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('Asia/Ho_Chi_Minh')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa hồ sơ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Riêng tư')).not.toBeInTheDocument();
  });
});
