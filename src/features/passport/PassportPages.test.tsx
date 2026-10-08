import { UiLocaleProvider, useUiLocale } from '../ui-locale/UiLocaleProvider';
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
  window.localStorage.clear();
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

const learningProgress = {
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  streakTimezone: 'Asia/Ho_Chi_Minh',
  activeDays: [],
  milestones: [],
  recentQualifyingActivity: [],
};

const communityProgress = {
  communityReputation: 0,
  contributorLevel: {
    id: 'NEWCOMER',
    title: 'Newcomer',
    minReputation: 0,
    nextLevel: { id: 'HELPER', title: 'Helper', minReputation: 5 },
  },
  badges: [],
  activeContributionCount: 0,
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
      getLearningProgress: vi.fn().mockResolvedValue(learningProgress),
      getContributorProgress: vi.fn().mockResolvedValue(communityProgress),
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
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu thay đổi');
    expect(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toHaveFocus();
  });

  it('replaces the read-only body with a focused editor and active edit state', async () => {
    const ui = userEvent.setup();
    const api: PassportApi = {
      getLanguages: vi.fn().mockResolvedValue(catalog),
      getProfile: vi.fn().mockResolvedValue(ownProfile),
      updateProfile: vi.fn().mockResolvedValue(ownProfile),
      getPublicProfile: vi.fn(),
      getLearningProgress: vi.fn().mockResolvedValue(learningProgress),
      getContributorProgress: vi.fn().mockResolvedValue(communityProgress),
    };
    renderWithAuth(<MemoryRouter initialEntries={['/profile']}><OwnPassportPage api={api} userId='user-1' /></MemoryRouter>);

    await ui.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }));

    expect(screen.getByText('Linh Nguyễn', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('Bạn đang chỉnh sửa hồ sơ')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đang chỉnh sửa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đang chỉnh sửa' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('heading', { name: 'Những ngôn ngữ tạo nên bạn' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cập nhật những điều/ })).toHaveFocus();
  });

  it('cancels editing, restores the read-only view, and returns focus to the trigger', async () => {
    const ui = userEvent.setup();
    const api: PassportApi = {
      getLanguages: vi.fn().mockResolvedValue(catalog),
      getProfile: vi.fn().mockResolvedValue(ownProfile),
      updateProfile: vi.fn().mockResolvedValue(ownProfile),
      getPublicProfile: vi.fn(),
      getLearningProgress: vi.fn().mockResolvedValue(learningProgress),
      getContributorProgress: vi.fn().mockResolvedValue(communityProgress),
    };
    renderWithAuth(<MemoryRouter initialEntries={['/profile']}><OwnPassportPage api={api} userId='user-1' /></MemoryRouter>);

    await ui.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
    await ui.click(screen.getByRole('button', { name: 'Hủy' }));

    expect(screen.getByRole('heading', { name: 'Những ngôn ngữ tạo nên bạn' })).toBeVisible();
    expect(screen.queryByText('Bạn đang chỉnh sửa hồ sơ')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toHaveFocus();
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

function SwitchLocale() { const { locale, setLocale } = useUiLocale(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch locale</button>; }
it('keeps unsaved profile language and privacy values, user text and session stable across vi/en', async () => {
 const ui = userEvent.setup(); const updateProfile = vi.fn().mockResolvedValue(ownProfile); const authApi = createAuthApi();
 const api: PassportApi = {getLanguages: vi.fn().mockResolvedValue(catalog), getProfile: vi.fn().mockResolvedValue(ownProfile), updateProfile, getPublicProfile: vi.fn(), getLearningProgress: vi.fn().mockResolvedValue(learningProgress), getContributorProgress: vi.fn().mockResolvedValue(communityProgress)};
 renderWithAuth(<UiLocaleProvider><MemoryRouter initialEntries={['/profile']}><SwitchLocale /><OwnPassportPage api={api} userId='user-1' /></MemoryRouter></UiLocaleProvider>,authApi);
 await ui.click(await screen.findByRole('button',{name:'Chỉnh sửa hồ sơ'}));
 await ui.selectOptions(screen.getAllByLabelText('Hiển thị trên hồ sơ')[0], 'PRIVATE');
 await ui.click(screen.getByRole('button',{name:'Switch locale'}));
 expect(screen.getByRole('heading',{name:'Update your language journey'})).toBeVisible();
 expect(screen.getAllByLabelText('Profile visibility')[0]).toHaveValue('PRIVATE');
 expect(screen.getByText('Tuesday · 19:00–20:00')).toBeVisible();
 expect(screen.getByText('music')).toBeVisible();
 await ui.selectOptions(screen.getAllByLabelText('Self-assessed proficiency')[1], 'B2');
 expect(document.documentElement.lang).toBe('en');
 await ui.click(screen.getByRole('button',{name:'Switch locale'}));
 expect(screen.getAllByLabelText('Mức tự đánh giá')[1]).toHaveValue('B2');
 await ui.click(screen.getByRole('button',{name:'Lưu thay đổi'}));
 await waitFor(()=>expect(updateProfile).toHaveBeenCalledTimes(1));
 expect(updateProfile.mock.calls[0][0].languages).toEqual(expect.arrayContaining([expect.objectContaining({languageCode:'vi',roles:['native'],visibility:'PRIVATE',declaredProficiency:'NATIVE'}),expect.objectContaining({languageCode:'en',roles:['learning'],declaredProficiency:'B2',isPrimaryLearningTarget:true})]));
 expect(authApi.bootstrap).toHaveBeenCalledTimes(1); expect(api.getProfile).toHaveBeenCalledTimes(1);
});
it('maps unknown profile save errors to safe localized feedback', async () => {
 window.localStorage.setItem('congdongngonngu.ui-locale.v1','en'); const ui=userEvent.setup();
 const api: PassportApi = {getLanguages:vi.fn().mockResolvedValue(catalog),getProfile:vi.fn().mockResolvedValue(ownProfile),updateProfile:vi.fn().mockRejectedValue(new Error('SQL provider secret internal-id')),getPublicProfile:vi.fn(),getLearningProgress:vi.fn().mockResolvedValue(learningProgress),getContributorProgress:vi.fn().mockResolvedValue(communityProgress)};
 renderWithAuth(<UiLocaleProvider><MemoryRouter><OwnPassportPage api={api} userId='user-1'/></MemoryRouter></UiLocaleProvider>);
 await ui.click(await screen.findByRole('button',{name:'Edit profile'})); await ui.click(screen.getByRole('button',{name:'Save changes'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save changes right now.');
 expect(screen.queryByText(/SQL provider/)).not.toBeInTheDocument();
});
