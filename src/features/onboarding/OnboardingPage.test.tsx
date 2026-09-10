import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthApi } from '../auth/auth-api';
import { AuthProvider } from '../auth/AuthProvider';
import type { AuthUser } from '../auth/auth.types';
import { OnboardingPage } from './OnboardingPage';
import type { LanguageCatalogItem, OwnProfile } from './onboarding.types';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const user: AuthUser = {
  id: 'user-1',
  email: 'learner@example.com',
  displayName: 'Người học',
  status: 'ACTIVE',
  emailVerified: true,
  roles: ['MEMBER'],
};

const languages: LanguageCatalogItem[] = [
  { code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr', active: true, launch: true, sortOrder: 10 },
  { code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', direction: 'ltr', active: true, launch: true, sortOrder: 20 },
  { code: 'zh', slug: 'chinese', nativeName: '中文', englishName: 'Chinese', vietnameseName: 'Tiếng Trung', direction: 'ltr', active: true, launch: true, sortOrder: 30 },
  { code: 'ja', slug: 'japanese', nativeName: '日本語', englishName: 'Japanese', vietnameseName: 'Tiếng Nhật', direction: 'ltr', active: true, launch: true, sortOrder: 40 },
  { code: 'ko', slug: 'korean', nativeName: '한국어', englishName: 'Korean', vietnameseName: 'Tiếng Hàn', direction: 'ltr', active: true, launch: true, sortOrder: 50 },
  { code: 'fr', slug: 'french', nativeName: 'Français', englishName: 'French', vietnameseName: 'Tiếng Pháp', direction: 'ltr', active: true, launch: true, sortOrder: 60 },
  { code: 'de', slug: 'german', nativeName: 'Deutsch', englishName: 'German', vietnameseName: 'Tiếng Đức', direction: 'ltr', active: true, launch: true, sortOrder: 70 },
  { code: 'es', slug: 'spanish', nativeName: 'Español', englishName: 'Spanish', vietnameseName: 'Tiếng Tây Ban Nha', direction: 'ltr', active: true, launch: true, sortOrder: 80 },
];

const emptyProfile: OwnProfile = {
  scope: 'own',
  user,
  languages: [],
  goals: [],
  skills: [],
  interests: [],
  timezone: null,
  availability: [],
};

function createApi() {
  const api = new AuthApi();
  vi.spyOn(api, 'bootstrap').mockResolvedValue(user);
  vi.spyOn(api, 'getProviders').mockResolvedValue({ providers: [] });
  vi.spyOn(api, 'getLanguages').mockResolvedValue(languages);
  vi.spyOn(api, 'getProfile').mockResolvedValue(emptyProfile);
  vi.spyOn(api, 'updateProfile').mockResolvedValue(emptyProfile);
  return api;
}

function renderPage(api: AuthApi, initialEntries = ['/onboarding']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider api={api}>
        <Routes>
          <Route path='/onboarding' element={<OnboardingPage api={api} userId={user.id} />} />
          <Route path='/' element={<p>Trang chủ kiểm thử</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function waitForReady() {
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn nói ngôn ngữ nào?' })).toBeVisible());
}

function getLanguageChoice(language: string, groupName: RegExp) {
  const groups = screen.getAllByRole('group', { name: groupName });
  return within(groups[groups.length - 1]).getByRole('button', { name: new RegExp(language, 'i') });
}

describe('OnboardingPage', () => {
  it('loads the catalog, searches native names and supports duplicate-safe multi-select', async () => {
    const api = createApi();
    const ui = userEvent.setup();
    renderPage(api);
    await waitForReady();

    const search = screen.getByRole('combobox', { name: 'Tìm và thêm ngôn ngữ' });
    await ui.type(search, '日本');
    expect(screen.getByRole('option', { name: /日本語/ })).toBeVisible();
    await ui.click(screen.getByRole('option', { name: /日本語/ }));
    expect(screen.getByText(/日本語 \(Đã biết\)/)).toBeVisible();

    await ui.click(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/));
    expect(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/)).toHaveAttribute('aria-pressed', 'true');
    await ui.click(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/));
    expect(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps long language labels selectable', async () => {
    const api = createApi();
    const longNativeName = 'Ti\u1ebfng c\u1ed9ng \u0111\u1ed3ng ng\u00f4n ng\u1eef qu\u1ed1c t\u1ebf r\u1ea5t d\u00e0i';
    vi.spyOn(api, 'getLanguages').mockResolvedValue([
      ...languages,
      {
        ...languages[0],
        code: 'xx',
        slug: 'long-language',
        nativeName: longNativeName,
        englishName: 'International Community Language',
        vietnameseName: longNativeName,
        sortOrder: 90,
      },
    ]);
    const ui = userEvent.setup();
    renderPage(api);
    await waitForReady();

    const choice = getLanguageChoice(longNativeName, /Ngôn ngữ bản ngữ/);
    expect(choice).toBeVisible();
    await ui.click(choice);
    expect(choice).toHaveAttribute('aria-pressed', 'true');
  });

  it('focuses the first invalid field and preserves progress when navigating back', async () => {
    const api = createApi();
    const ui = userEvent.setup();
    renderPage(api);
    await waitForReady();

    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/chọn ít nhất một ngôn ngữ bạn nói/i);
    expect(screen.getByRole('combobox', { name: 'Tìm và thêm ngôn ngữ' })).toHaveFocus();

    await ui.click(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn muốn học ngôn ngữ nào?' })).toBeVisible());
    await ui.click(screen.getByRole('button', { name: /Quay lại/i }));
    await waitForReady();
    expect(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a retryable catalog error', async () => {
    const api = createApi();
    const getLanguages = vi.spyOn(api, 'getLanguages');
    getLanguages.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(languages);
    const ui = userEvent.setup();
    renderPage(api);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/không tải được danh sách ngôn ngữ/i));
    await ui.click(screen.getByRole('button', { name: /Thử tải lại danh sách/i }));
    await waitForReady();
    expect(getLanguages).toHaveBeenCalledTimes(2);
  });

  it('responds to browser back by restoring the previous onboarding step', async () => {
    const api = createApi();
    const ui = userEvent.setup();
    renderPage(api);
    await waitForReady();

    await ui.click(getLanguageChoice('Ti\u1ebfng Vi\u1ec7t', /Ng\u00f4n ng\u1eef b\u1ea3n ng\u1eef/));
    await ui.click(screen.getByRole('button', { name: /Ti\u1ebfp t\u1ee5c/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /B\u1ea1n mu\u1ed1n h\u1ecdc ng\u00f4n ng\u1eef n\u00e0o\?/ })).toBeVisible());

    window.history.back();
    await waitForReady();
    expect(window.history.state.onboardingStep).toBe(0);
    expect(getLanguageChoice('Ti\u1ebfng Vi\u1ec7t', /Ng\u00f4n ng\u1eef b\u1ea3n ng\u1eef/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('resumes a saved step after remounting', async () => {
    const api = createApi();
    const ui = userEvent.setup();
    const first = renderPage(api);
    await waitForReady();
    await ui.click(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn muốn học ngôn ngữ nào?' })).toBeVisible());
    first.unmount();

    renderPage(api);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn muốn học ngôn ngữ nào?' })).toBeVisible());
    expect(screen.getByText('Bước 2/5')).toBeVisible();
  });

  it('requires a declared level before submitting the core profile', async () => {
    const api = createApi();
    const ui = userEvent.setup();
    renderPage(api);
    await waitForReady();

    await ui.click(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn muốn học ngôn ngữ nào?' })).toBeVisible());
    await ui.click(getLanguageChoice('English', /Ngôn ngữ bạn muốn học/));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Trình độ hiện tại của bạn?' })).toBeVisible());
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/chọn trình độ/i);
    expect(screen.getByRole('radiogroup', { name: /English/i })).toHaveFocus();
  });

  it('skips optional details only after saving the required onboarding data', async () => {
    const api = createApi();
    const updateProfile = vi.spyOn(api, 'updateProfile');
    const ui = userEvent.setup();
    renderPage(api);
    await waitForReady();

    await ui.click(getLanguageChoice('Tiếng Việt', /Ngôn ngữ bản ngữ/));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn muốn học ngôn ngữ nào?' })).toBeVisible());
    await ui.click(getLanguageChoice('English', /Ngôn ngữ bạn muốn học/));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Trình độ hiện tại của bạn?' })).toBeVisible());
    await ui.click(screen.getByRole('radio', { name: /A1/i }));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn muốn học như thế nào?' })).toBeVisible());
    await ui.click(screen.getByRole('button', { name: /Giao tiếp/i }));
    await ui.click(screen.getByRole('button', { name: /Nói/i }));
    await ui.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Thêm một chút về lịch của bạn' })).toBeVisible());
    await ui.click(screen.getByRole('button', { name: /Bỏ qua bước này/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile.mock.calls[0][0].languages).toEqual([
      { languageCode: 'vi', roles: ['native'], declaredProficiency: 'NATIVE' },
      { languageCode: 'en', roles: ['learning'], declaredProficiency: 'A1', isPrimaryLearningTarget: true },
    ]);
    expect(screen.getByText('Trang chủ kiểm thử')).toBeVisible();
  });

  it('does not reopen after completion for the same user', async () => {
    const api = createApi();
    window.localStorage.setItem('cdn:onboarding:complete:user-1', '1');
    renderPage(api);

    await waitFor(() => expect(screen.getByText('Trang chủ kiểm thử')).toBeVisible());
    expect(screen.queryByRole('heading', { name: 'Bạn nói ngôn ngữ nào?' })).not.toBeInTheDocument();
  });
});
