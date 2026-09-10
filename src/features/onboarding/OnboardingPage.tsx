import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import { ErrorState } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon/Icon';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../auth/AuthProvider';
import {
  buildProfileUpdate,
  createInitialDraft,
  draftFromProfile,
  filterLanguages,
  isOnboardingComplete,
  isProfileOnboardingComplete,
  markOnboardingComplete,
  readOnboardingDraft,
  sanitizeLanguageCatalog,
  toggleCode,
  validateDraftForStep,
  writeOnboardingDraft,
} from './onboarding-state';
import {
  ONBOARDING_STEP_COUNT,
  PROFICIENCY_VALUES,
  type LanguageCatalogItem,
  type LanguageRole,
  type OnboardingApi,
  type OnboardingDraft,
  type ProfileSkill,
} from './onboarding.types';
import styles from './OnboardingPage.module.css';

const STEPS = [
  { label: 'Ngôn ngữ bạn nói', eyebrow: 'Thiết lập ngôn ngữ', title: 'Bạn nói ngôn ngữ nào?', description: 'Chào mừng bạn đến với cộng đồng. Hãy cho chúng tôi biết những ngôn ngữ bạn đã quen thuộc để kết nối đúng người học và nội dung phù hợp.' },
  { label: 'Ngôn ngữ muốn học', eyebrow: 'Mục tiêu học tập', title: 'Bạn muốn học ngôn ngữ nào?', description: 'Chọn một hoặc vài ngôn ngữ để chúng tôi gợi ý nội dung và bạn học phù hợp hơn.' },
  { label: 'Trình độ hiện tại', eyebrow: 'Mức độ quen thuộc', title: 'Trình độ hiện tại của bạn?', description: 'Một ước lượng nhanh là đủ. Bạn có thể cập nhật lại sau khi đã học thêm.' },
  { label: 'Mục tiêu & kỹ năng', eyebrow: 'Cách bạn muốn học', title: 'Bạn muốn học như thế nào?', description: 'Chọn điều bạn muốn đạt được và những kỹ năng bạn muốn luyện tập cùng cộng đồng.' },
  { label: 'Lịch học linh hoạt', eyebrow: 'Thông tin thêm', title: 'Thêm một chút về lịch của bạn', description: 'Phần này hoàn toàn tùy chọn. Chia sẻ thêm để việc tìm bạn học cùng nhịp dễ dàng hơn.' },
] as const;

const GOAL_OPTIONS = [
  { value: 'conversation', label: 'Giao tiếp tự tin', description: 'Trò chuyện tự nhiên hơn' },
  { value: 'travel', label: 'Du lịch', description: 'Thoải mái trong những chuyến đi' },
  { value: 'work', label: 'Công việc', description: 'Mở rộng cơ hội nghề nghiệp' },
  { value: 'reading', label: 'Đọc nội dung', description: 'Hiểu sách, báo và văn hóa' },
  { value: 'community', label: 'Kết bạn', description: 'Gặp gỡ những người cùng học' },
  { value: 'exam', label: 'Thi cử', description: 'Chuẩn bị cho một kỳ thi' },
] as const;

const SKILL_OPTIONS: Array<{ value: ProfileSkill; label: string }> = [
  { value: 'speaking', label: 'Nói' },
  { value: 'listening', label: 'Nghe' },
  { value: 'reading', label: 'Đọc' },
  { value: 'writing', label: 'Viết' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'vocabulary', label: 'Từ vựng' },
];

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (UTC+07:00)' },
  { value: 'Asia/Shanghai', label: 'Trung Quốc (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Nhật Bản (UTC+09:00)' },
  { value: 'Asia/Seoul', label: 'Hàn Quốc (UTC+09:00)' },
  { value: 'Europe/Paris', label: 'Pháp (UTC+01:00)' },
  { value: 'Europe/Berlin', label: 'Đức (UTC+01:00)' },
  { value: 'America/New_York', label: 'Bờ Đông Hoa Kỳ (UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'Bờ Tây Hoa Kỳ (UTC-08:00)' },
];

const DAYS = [
  { value: 1, label: 'Thứ hai' },
  { value: 2, label: 'Thứ ba' },
  { value: 3, label: 'Thứ tư' },
  { value: 4, label: 'Thứ năm' },
  { value: 5, label: 'Thứ sáu' },
  { value: 6, label: 'Thứ bảy' },
  { value: 7, label: 'Chủ nhật' },
];

type PickerMode = 'spoken' | 'learning';
type CatalogLoadState = 'loading' | 'ready' | 'error';

interface OnboardingPageProps {
  api?: OnboardingApi;
  userId?: string;
}

export function OnboardingPage({ api: providedApi, userId: providedUserId }: OnboardingPageProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onboardingApi = providedApi ?? auth.api;
  const resolvedUserId = providedUserId ?? auth.user?.id ?? '';
  const storage = getClientStorage();
  const searchId = useId();
  const listId = `${searchId}-language-options`;
  const searchRef = useRef<HTMLInputElement>(null);
  const levelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draft, setDraft] = useState<OnboardingDraft>(createInitialDraft);
  const [catalog, setCatalog] = useState<LanguageCatalogItem[]>([]);
  const [loadState, setLoadState] = useState<CatalogLoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [stepError, setStepError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [interestValue, setInterestValue] = useState('');
  const [availabilityDay, setAvailabilityDay] = useState(2);
  const [availabilityStart, setAvailabilityStart] = useState('19:00');
  const [availabilityEnd, setAvailabilityEnd] = useState('20:00');
  const resetSearch = useCallback((): void => {
    setSearchValue('');
    setSearchOpen(false);
    setActiveSearchIndex(0);
  }, []);

  const loadData = useCallback(() => {
    if (!resolvedUserId) return;
    const savedDraft = readOnboardingDraft(storage, resolvedUserId);
    setDraft(savedDraft);
    setLoadState('loading');
    setLoadError('');
    Promise.all([onboardingApi.getLanguages(), onboardingApi.getProfile()])
      .then(([rawCatalog, profile]) => {
        const nextCatalog = sanitizeLanguageCatalog(rawCatalog);
        if (nextCatalog.length === 0) throw new Error('The language catalog is unavailable.');
        if (!hasDraftContent(savedDraft)) {
          if (isProfileOnboardingComplete(profile)) {
            markOnboardingComplete(storage, resolvedUserId);
            navigate('/', { replace: true, state: { from: location.pathname } });
            return;
          }
          setDraft(draftFromProfile(profile));
        }
        setCatalog(nextCatalog);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setLoadState('error');
        setLoadError(error instanceof Error ? error.message : 'Unable to load onboarding data.');
      });
  }, [location.pathname, navigate, onboardingApi, resolvedUserId, storage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (resolvedUserId && loadState === 'ready') writeOnboardingDraft(storage, resolvedUserId, draft);
  }, [draft, loadState, resolvedUserId, storage]);

  useEffect(() => {
    if (loadState !== 'ready') return;
    const currentState = window.history.state;
    if (typeof currentState?.onboardingDepth === 'number') return;
    window.history.replaceState(
      { ...currentState, onboardingFlow: true, onboardingStep: draft.step, onboardingDepth: 0 },
      '',
      window.location.href,
    );
  }, [draft.step, loadState]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const previousStep = event.state?.onboardingStep;
      if (typeof previousStep === 'number' && previousStep >= 0 && previousStep < ONBOARDING_STEP_COUNT) {
        setDraft((current) => ({ ...current, step: previousStep }));
        setStepError('');
        resetSearch();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resetSearch]);

  const filteredSearchResults = useMemo(
    () => filterLanguages(catalog, searchValue).slice(0, 8),
    [catalog, searchValue],
  );
  const currentStep = STEPS[draft.step] ?? STEPS[0];
  const storageComplete = isOnboardingComplete(storage, resolvedUserId);

  function updateDraft(updater: (current: OnboardingDraft) => OnboardingDraft): void {
    setDraft((current) => updater(current));
    setStepError('');
    setSaveError('');
  }

  function toggleRole(code: string, role: LanguageRole): void {
    updateDraft((current) => {
      const field = role === 'native' ? 'nativeCodes' : role === 'known' ? 'knownCodes' : 'learningCodes';
      return { ...current, [field]: toggleCode(current[field], code) };
    });
  }

  function removeRole(code: string, role: LanguageRole): void {
    updateDraft((current) => {
      const field = role === 'native' ? 'nativeCodes' : role === 'known' ? 'knownCodes' : 'learningCodes';
      return { ...current, [field]: current[field].filter((item) => item !== code) };
    });
  }

  function chooseSearchLanguage(code: string): void {
    toggleRole(code, draft.step === 1 ? 'learning' : 'known');
    resetSearch();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      resetSearch();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((index) => Math.min(index + 1, Math.max(filteredSearchResults.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && searchOpen && filteredSearchResults[activeSearchIndex]) {
      event.preventDefault();
      chooseSearchLanguage(filteredSearchResults[activeSearchIndex].code);
    }
  }

  function setLevel(code: string, level: typeof PROFICIENCY_VALUES[number]): void {
    updateDraft((current) => ({ ...current, levels: { ...current.levels, [code]: level } }));
  }

  function toggleGoal(value: string): void {
    updateDraft((current) => ({ ...current, goals: toggleCode(current.goals, value) }));
  }

  function toggleSkill(value: ProfileSkill): void {
    updateDraft((current) => ({ ...current, skills: toggleCode(current.skills, value) as ProfileSkill[] }));
  }

  function addInterest(): void {
    const value = interestValue.trim().replace(/\s+/g, ' ');
    if (!value) return;
    updateDraft((current) => current.interests.includes(value.toLowerCase())
      ? current
      : { ...current, interests: [...current.interests, value.toLowerCase()] });
    setInterestValue('');
  }

  function addAvailability(): void {
    if (timeToMinutes(availabilityStart) >= timeToMinutes(availabilityEnd)) {
      setStepError('Thời gian kết thúc cần muộn hơn thời gian bắt đầu.');
      return;
    }
    updateDraft((current) => ({
      ...current,
      availability: [...current.availability, { dayOfWeek: availabilityDay, startTime: availabilityStart, endTime: availabilityEnd }],
    }));
  }

  async function finish(): Promise<void> {
    setSaving(true);
    setSaveError('');
    try {
      await onboardingApi.updateProfile(buildProfileUpdate(draft));
      markOnboardingComplete(storage, resolvedUserId);
      navigate('/', { replace: true, state: { from: location.pathname } });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) void auth.refresh().catch(() => undefined);
      setSaveError('Chưa thể lưu thiết lập lúc này. Kiểm tra kết nối và thử lại.');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>, skipOptional = false): void {
    event.preventDefault();
    const validationStep = skipOptional ? 3 : draft.step;
    const errors = validateDraftForStep(draft, validationStep);
    const firstError = errors.spokenLanguages ?? errors.learningLanguages ?? errors.levels ?? errors.goals ?? errors.skills ?? errors.availability;
    if (firstError) {
      setStepError(firstError);
      focusFirstInvalid(errors);
      return;
    }
    if (draft.step < ONBOARDING_STEP_COUNT - 1 && !skipOptional) {
      const nextStep = draft.step + 1;
      const currentDepth = typeof window.history.state?.onboardingDepth === 'number'
        ? window.history.state.onboardingDepth
        : 0;
      window.history.pushState(
        { ...window.history.state, onboardingFlow: true, onboardingStep: nextStep, onboardingDepth: currentDepth + 1 },
        '',
        window.location.href,
      );
      setDraft((current) => ({ ...current, step: nextStep }));
      setStepError('');
      resetSearch();
      return;
    }
    void finish();
  }

  function focusFirstInvalid(errors: ReturnType<typeof validateDraftForStep>): void {
    if (errors.spokenLanguages || errors.learningLanguages) {
      searchRef.current?.focus();
      return;
    }
    if (errors.levels) {
      const firstMissing = unique([...draft.knownCodes, ...draft.learningCodes])
        .find((code) => !draft.nativeCodes.includes(code) && !draft.levels[code]);
      if (firstMissing) levelRefs.current[firstMissing]?.focus();
      return;
    }
    document.querySelector<HTMLElement>('[data-onboarding-error-target=true]')?.focus();
  }

  function handleBack(): void {
    if (draft.step === 0) {
      navigate('/');
      return;
    }
    if (typeof window.history.state?.onboardingDepth === 'number' && window.history.state.onboardingDepth > 0) {
      window.history.back();
      return;
    }
    const previousStep = draft.step - 1;
    window.history.replaceState(
      { ...window.history.state, onboardingFlow: true, onboardingStep: previousStep, onboardingDepth: 0 },
      '',
      window.location.href,
    );
    setDraft((current) => ({ ...current, step: previousStep }));
    setStepError('');
    resetSearch();
  }

  if (storageComplete) return <Navigate to='/' replace state={{ from: location.pathname }} />;
  if (!providedUserId && auth.status === 'loading') return <OnboardingLoading />;
  if (!resolvedUserId) return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  if (loadState === 'loading') return <OnboardingLoading />;
  if (loadState === 'error') {
    return (
      <section className={styles.loadingFrame} aria-labelledby='onboarding-load-error'>
        <ErrorState
          title='Không tải được danh sách ngôn ngữ'
          description='Danh sách ngôn ngữ hoặc hồ sơ của bạn chưa sẵn sàng. Thử tải lại để tiếp tục thiết lập.'
          onRetry={loadData}
          retryLabel='Thử tải lại danh sách'
        />
        <p className={styles.srOnly} id='onboarding-load-error'>{loadError}</p>
      </section>
    );
  }

  return (
    <section className={styles.onboardingPage} aria-labelledby='onboarding-title'>
      <div className={styles.flowTopline}>
        <div><p className={styles.flowLabel}>Thiết lập hồ sơ học tập</p><p className={styles.flowHint}>Một vài câu hỏi ngắn để cộng đồng hiểu bạn hơn.</p></div>
        <div className={styles.progressMeta}><span>Bước {draft.step + 1}/{ONBOARDING_STEP_COUNT}</span><span className={styles.progressPercent}>{Math.round(((draft.step + 1) / ONBOARDING_STEP_COUNT) * 100)}%</span></div>
      </div>
      <div className={styles.progressBar} role='progressbar' aria-label='Tiến trình thiết lập hồ sơ' aria-valuemin={1} aria-valuemax={ONBOARDING_STEP_COUNT} aria-valuenow={draft.step + 1} aria-valuetext={`Bước ${draft.step + 1} trên ${ONBOARDING_STEP_COUNT}`}><span style={{ width: `${((draft.step + 1) / ONBOARDING_STEP_COUNT) * 100}%` }} /></div>

      <div className={styles.onboardingGrid}>
        <div className={styles.formColumn}>
          <header className={styles.stepHeader}>
            <p className={styles.kicker}>BƯỚC {draft.step + 1} TRÊN {ONBOARDING_STEP_COUNT} <span aria-hidden='true'>•</span> {currentStep.eyebrow.toUpperCase()}</p>
            <h1 id='onboarding-title'>{currentStep.title}</h1>
            <p>{currentStep.description}</p>
            <p className={styles.reassurance}><Icon name='lock' size={16} /> Bạn có thể chỉnh sửa sau bất kỳ lúc nào trong cài đặt.</p>
          </header>

          <form className={styles.onboardingForm} onSubmit={(event) => handleSubmit(event)} noValidate>
            {draft.step === 0 ? <div className={styles.stepContent}>{renderLanguagePicker('spoken')}<div className={styles.languageGroups}>{renderLanguageGroup('native')}{renderLanguageGroup('known')}</div></div> : null}
            {draft.step === 1 ? <div className={styles.stepContent}>{renderLanguagePicker('learning')}{renderLanguageGroup('learning')}</div> : null}
            {draft.step === 2 ? <div className={styles.stepContent}>{renderLevels()}</div> : null}
            {draft.step === 3 ? <div className={styles.stepContent}>{renderGoalsAndSkills()}</div> : null}
            {draft.step === 4 ? <div className={styles.stepContent}>{renderOptionalDetails()}</div> : null}
            {stepError ? <p className={styles.formError} role='alert'>{stepError}</p> : null}
            {saveError ? <p className={styles.formError} role='alert'>{saveError}</p> : null}
            <div className={styles.actionBar}>
              {draft.step === 4 ? <button className={styles.skipButton} type='button' onClick={(event) => handleSubmit(event, true)}>Bỏ qua bước này</button> : <span className={styles.actionNote}>Bạn có thể chỉnh sửa sau</span>}
              <div className={styles.actionButtons}><Button variant='quiet' type='button' onClick={handleBack} disabled={saving || draft.step === 0}>Quay lại</Button><Button variant='secondary' size='lg' type='submit' loading={saving}>{draft.step === 4 ? 'Hoàn tất thiết lập' : 'Tiếp tục'} <Icon name='chevron-down' size={18} className={styles.forwardIcon} /></Button></div>
            </div>
          </form>
        </div>

        <aside className={styles.contextRail} aria-label='Tiến trình thiết lập'>
          <nav aria-label='Các bước thiết lập'><p className={styles.railLabel}>Lộ trình của bạn</p><ol className={styles.roadmap}>{STEPS.map((step, index) => <li className={index === draft.step ? styles.roadmapActive : index < draft.step ? styles.roadmapDone : ''} key={step.label} aria-current={index === draft.step ? 'step' : undefined}><span className={styles.roadmapMarker} aria-hidden='true'>{index < draft.step ? <Icon name='check-circle' size={18} /> : index + 1}</span><span><strong>{step.label}</strong><small>{index === draft.step ? 'Đang thực hiện' : index < draft.step ? 'Đã hoàn thành' : 'Chưa thực hiện'}</small></span></li>)}</ol></nav>
          <div className={styles.privacyNote}><Icon name='lock' size={18} /><div><strong>Quyền riêng tư & linh hoạt</strong><p>Thông tin bạn chọn chỉ dùng để gợi ý chủ đề và tìm bạn học cùng nhịp độ.</p><small>Bạn có thể chỉnh sửa sau bất kỳ lúc nào.</small></div></div>
        </aside>
      </div>
    </section>
  );

  function renderLanguagePicker(mode: PickerMode) {
    const learningMode = mode === 'learning';
    const chipCodes = learningMode ? draft.learningCodes : unique([...draft.nativeCodes, ...draft.knownCodes]);
    return (
      <div className={styles.pickerSection}>
        <label className={styles.fieldLabel} htmlFor={searchId}>Tìm và thêm ngôn ngữ</label>
        <div className={styles.comboboxShell}>
          <Icon name='search' size={20} />
          <input
            ref={searchRef}
            id={searchId}
            className={styles.comboboxInput}
            role='combobox'
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? listId : undefined}
            aria-autocomplete='list'
            autoComplete='off'
            value={searchValue}
            placeholder='Nhập tên ngôn ngữ (ví dụ: Tiếng Việt, English, 日本語...)'
            onFocus={() => setSearchOpen(Boolean(searchValue.trim()))}
            onChange={(event) => {
              setSearchValue(event.target.value);
              setSearchOpen(Boolean(event.target.value.trim()));
              setActiveSearchIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {searchOpen && searchValue.trim() ? (
          <ul className={styles.searchResults} id={listId} role='listbox' aria-label='Kết quả ngôn ngữ'>
            {filteredSearchResults.length > 0 ? filteredSearchResults.map((language, index) => {
              const selected = learningMode
                ? draft.learningCodes.includes(language.code)
                : draft.nativeCodes.includes(language.code) || draft.knownCodes.includes(language.code);
              return (
                <li key={language.code}>
                  <button
                    className={index === activeSearchIndex ? styles.searchResultActive : styles.searchResult}
                    type='button'
                    role='option'
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSearchLanguage(language.code)}
                  >
                    <span><strong>{language.nativeName}</strong><small>{language.vietnameseName} · {language.englishName}</small></span>
                    <span className={styles.searchResultAction}>{selected ? 'Đã chọn' : 'Thêm'}</span>
                  </button>
                </li>
              );
            }) : <li className={styles.noResults}>Không tìm thấy ngôn ngữ phù hợp.</li>}
          </ul>
        ) : null}
        <div className={styles.selectedLanguages} aria-live='polite'>
          <span className={styles.selectedLabel}>{learningMode ? 'Đã chọn để học:' : 'Đã chọn cho hồ sơ của bạn:'}</span>
          {chipCodes.length > 0 ? chipCodes.flatMap((code) => {
            const language = findLanguage(code);
            const roles = learningMode ? ['learning' as const] : [
              ...(draft.nativeCodes.includes(code) ? ['native' as const] : []),
              ...(draft.knownCodes.includes(code) ? ['known' as const] : []),
            ];
            return roles.map((role) => (
              <span className={`${styles.languageChip} ${role === 'native' ? styles.languageChipNative : role === 'learning' ? styles.languageChipLearning : styles.languageChipKnown}`} key={`${code}-${role}`}>
                <span className={styles.chipDot} aria-hidden='true' />
                <span>{language.nativeName} ({roleLabel(role)})</span>
                <button type='button' aria-label={`Xóa ${language.nativeName} (${roleLabel(role)})`} onClick={() => removeRole(code, role)}><Icon name='x' size={16} /></button>
              </span>
            ));
          }) : <span className={styles.emptySelection}>Chưa có lựa chọn nào</span>}
        </div>
      </div>
    );
  }

  function renderLanguageGroup(role: LanguageRole) {
    const selectedCodes = role === 'native' ? draft.nativeCodes : role === 'known' ? draft.knownCodes : draft.learningCodes;
    const title = role === 'native'
      ? 'Ngôn ngữ bản ngữ (Tiếng mẹ đẻ)'
      : role === 'known'
        ? 'Ngôn ngữ bạn đã biết hoặc có thể giao tiếp cơ bản'
        : 'Ngôn ngữ bạn muốn học';
    const helper = role === 'native'
      ? 'Ngôn ngữ bạn dùng tự nhiên nhất từ nhỏ. Bạn có thể chọn nhiều hơn một.'
      : role === 'known'
        ? 'Chọn các ngôn ngữ bạn có thể đọc hiểu hoặc trò chuyện hàng ngày.'
        : 'Chọn những ngôn ngữ bạn muốn khám phá cùng cộng đồng.';
    const actionLabel = role === 'native' ? 'ngôn ngữ bản ngữ' : role === 'known' ? 'ngôn ngữ đã biết' : 'ngôn ngữ muốn học';
    return (
      <fieldset className={styles.languageGroup}>
        <legend>{title}</legend>
        <p className={styles.groupHelper}>{helper}</p>
        <div className={styles.choiceGrid} role='group' aria-label={title}>
          {catalog.map((language) => {
            const selected = selectedCodes.includes(language.code);
            const languageLabelId = `${searchId}-${role}-${language.code}-label`;
            const languageActionId = `${searchId}-${role}-${language.code}-action`;
            return (
              <button
                className={`${styles.languageChoice} ${selected ? styles.languageChoiceSelected : ''}`}
                type='button'
                key={language.code}
                aria-pressed={selected}
                aria-labelledby={languageLabelId}
                aria-describedby={languageActionId}
                onClick={() => toggleRole(language.code, role)}
              >
                <span id={languageLabelId}><strong>{language.nativeName}</strong><small>{language.englishName}</small></span>
                <span id={languageActionId} className={styles.srOnly}>{selected ? 'Đã chọn' : 'Chọn'} làm {actionLabel}</span>
                <span className={styles.checkIndicator} aria-hidden='true'>{selected ? <Icon name='check-circle' size={18} /> : null}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  function renderLevels() {
    const codes = unique([...draft.knownCodes, ...draft.learningCodes])
      .filter((code) => !draft.nativeCodes.includes(code));
    return (
      <section className={styles.levelSection} aria-labelledby='level-section-title'>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>MỘT ƯỚC LƯỢNG NHANH</p>
          <h2 id='level-section-title'>Bạn đang ở đâu với từng ngôn ngữ?</h2>
          <p>Chọn mức gần nhất với cảm nhận hiện tại của bạn. Không có câu trả lời đúng hay sai.</p>
        </div>
        {codes.length > 0 ? (
          <div className={styles.levelList}>
            {codes.map((code) => {
              const language = findLanguage(code);
              return (
                <div
                  className={styles.levelItem}
                  key={code}
                  ref={(element) => { levelRefs.current[code] = element; }}
                  role='radiogroup'
                  aria-label={`${language.nativeName} · ${language.englishName}`}
                  tabIndex={-1}
                >
                  <div className={styles.levelLanguage}>
                    <strong>{language.nativeName}</strong>
                    <span>{language.englishName}</span>
                    <small>{draft.learningCodes.includes(code) ? 'Đang học' : 'Đã biết'}</small>
                  </div>
                  <div className={styles.levelOptions}>
                    {PROFICIENCY_VALUES.filter((level) => level !== 'NATIVE').map((level) => (
                      <label className={`${styles.levelOption} ${draft.levels[code] === level ? styles.levelOptionSelected : ''}`} key={level}>
                        <input type='radio' name={`level-${code}`} value={level} checked={draft.levels[code] === level} onChange={() => setLevel(code, level)} />
                        <span>{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.nativeLevelNote}><Icon name='check-circle' size={20} /> Ngôn ngữ bạn chọn đã là bản ngữ, nên không cần khai báo thêm trình độ.</p>
        )}
      </section>
    );
  }

  function renderGoalsAndSkills() {
    return (
      <section className={styles.goalsSection} aria-labelledby='goals-section-title'>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>CÁ NHÂN HÓA GỢI Ý</p>
          <h2 id='goals-section-title'>Điều gì đưa bạn đến đây?</h2>
          <p>Chọn ít nhất một mục tiêu và một kỹ năng. Bạn có thể thay đổi những lựa chọn này sau.</p>
        </div>
        <fieldset className={styles.optionFieldset}>
          <legend>Mục tiêu của bạn</legend>
          <div className={styles.goalGrid}>
            {GOAL_OPTIONS.map((goal) => {
              const selected = draft.goals.includes(goal.value);
              const goalLabelId = `${searchId}-goal-${goal.value}-label`;
              const goalActionId = `${searchId}-goal-${goal.value}-action`;
              return (
                <button
                  className={`${styles.goalChoice} ${selected ? styles.goalChoiceSelected : ''}`}
                  type='button'
                  key={goal.value}
                  aria-pressed={selected}
                  aria-labelledby={goalLabelId}
                  aria-describedby={goalActionId}
                  data-onboarding-error-target={selected ? undefined : 'true'}
                  onClick={() => toggleGoal(goal.value)}
                >
                  <span id={goalLabelId}><strong>{goal.label}</strong><small>{goal.description}</small></span>
                  <span id={goalActionId} className={styles.srOnly}>{selected ? 'Đã chọn' : 'Chọn'} mục tiêu</span>
                  <span className={styles.checkIndicator} aria-hidden='true'>{selected ? <Icon name='check-circle' size={18} /> : null}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className={styles.optionFieldset}>
          <legend>Kỹ năng bạn muốn luyện tập</legend>
          <div className={styles.skillGrid}>
            {SKILL_OPTIONS.map((skill) => {
              const selected = draft.skills.includes(skill.value);
              const skillLabelId = `${searchId}-skill-${skill.value}-label`;
              const skillActionId = `${searchId}-skill-${skill.value}-action`;
              return (
                <button
                  className={`${styles.skillChoice} ${selected ? styles.skillChoiceSelected : ''}`}
                  type='button'
                  key={skill.value}
                  aria-pressed={selected}
                  aria-labelledby={skillLabelId}
                  aria-describedby={skillActionId}
                  data-onboarding-error-target={selected ? undefined : 'true'}
                  onClick={() => toggleSkill(skill.value)}
                >
                  <span id={skillLabelId}>{skill.label}</span>
                  <span id={skillActionId} className={styles.srOnly}>{selected ? 'Đã chọn' : 'Chọn'} kỹ năng</span>
                  {selected ? <Icon name='check-circle' size={18} /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>
    );
  }

  function renderOptionalDetails() {
    return (
      <section className={styles.optionalSection} aria-labelledby='optional-section-title'>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>KHÔNG BẮT BUỘC</p>
          <h2 id='optional-section-title'>Chọn thêm nếu bạn muốn</h2>
          <p>Bỏ qua phần này cũng được. Những thông tin này giúp chúng tôi gợi ý cuộc trò chuyện đúng lúc hơn.</p>
        </div>
        <div className={styles.optionalBlock}>
          <label className={styles.fieldLabel} htmlFor='interest-input'>Chủ đề bạn quan tâm</label>
          <div className={styles.inlineInput}>
            <input id='interest-input' value={interestValue} maxLength={64} placeholder='Ví dụ: âm nhạc, ẩm thực, sách...' onChange={(event) => setInterestValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addInterest(); } }} />
            <Button variant='quiet' type='button' onClick={addInterest}>Thêm</Button>
          </div>
          <div className={styles.interestList} aria-live='polite'>
            {draft.interests.map((interest) => <span className={styles.interestChip} key={interest}>{interest}<button type='button' aria-label={`Xóa sở thích ${interest}`} onClick={() => updateDraft((current) => ({ ...current, interests: current.interests.filter((item) => item !== interest) }))}><Icon name='x' size={16} /></button></span>)}
          </div>
        </div>
        <div className={styles.optionalBlock}>
          <label className={styles.fieldLabel} htmlFor='timezone-select'>Múi giờ của bạn</label>
          <select id='timezone-select' value={draft.timezone} onChange={(event) => updateDraft((current) => ({ ...current, timezone: event.target.value }))}>
            <option value=''>Chưa chọn</option>
            {TIMEZONES.map((timezone) => <option value={timezone.value} key={timezone.value}>{timezone.label}</option>)}
          </select>
          <p className={styles.fieldHint}>Chúng tôi chỉ dùng múi giờ để hiển thị thời gian phù hợp.</p>
        </div>
        <div className={styles.optionalBlock}>
          <div className={styles.fieldLabel}>Khung giờ bạn có thể trò chuyện</div>
          <div className={styles.availabilityFields}>
            <select aria-label='Ngày trong tuần' value={availabilityDay} onChange={(event) => setAvailabilityDay(Number(event.target.value))}>{DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select>
            <input aria-label='Giờ bắt đầu' type='time' value={availabilityStart} onChange={(event) => setAvailabilityStart(event.target.value)} />
            <span aria-hidden='true'>đến</span>
            <input aria-label='Giờ kết thúc' type='time' value={availabilityEnd} onChange={(event) => setAvailabilityEnd(event.target.value)} />
            <Button variant='quiet' type='button' onClick={addAvailability}>Thêm giờ</Button>
          </div>
          <ul className={styles.availabilityList}>
            {draft.availability.map((window, index) => <li key={`${window.dayOfWeek}-${window.startTime}-${index}`}><span>{DAYS.find((day) => day.value === window.dayOfWeek)?.label}: {window.startTime}–{window.endTime}</span><button type='button' aria-label={`Xóa khung giờ ${index + 1}`} onClick={() => updateDraft((current) => ({ ...current, availability: current.availability.filter((_, itemIndex) => itemIndex !== index) }))}><Icon name='x' size={16} /></button></li>)}
          </ul>
        </div>
      </section>
    );
  }

  function findLanguage(code: string): LanguageCatalogItem {
    return catalog.find((language) => language.code === code) ?? {
      code,
      slug: code,
      nativeName: code,
      englishName: code,
      vietnameseName: code,
      direction: 'ltr',
      active: true,
      launch: false,
      sortOrder: Number.MAX_SAFE_INTEGER,
    };
  }
}

function OnboardingLoading() {
  return <section className={styles.loadingFrame} aria-busy='true' aria-label='Đang tải thiết lập onboarding'><div className={styles.loadingLines}><span /><span /><span /><span /></div></section>;
}

function getClientStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hasDraftContent(draft: OnboardingDraft): boolean {
  return draft.step > 0 || draft.nativeCodes.length > 0 || draft.knownCodes.length > 0 || draft.learningCodes.length > 0
    || Object.keys(draft.levels).length > 0 || draft.goals.length > 0 || draft.skills.length > 0 || draft.interests.length > 0
    || Boolean(draft.timezone) || draft.availability.length > 0;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function roleLabel(role: LanguageRole): string {
  if (role === 'native') return 'Bản ngữ';
  if (role === 'known') return 'Đã biết';
  return 'Đang học';
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
