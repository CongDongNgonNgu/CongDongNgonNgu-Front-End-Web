import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorState } from '../../components/ui/Feedback';
import { ApiClientError } from '../../services/api-client';
import { useAuth } from '../auth/AuthProvider';
import { GoalsSkillsStep } from './components/GoalsSkillsStep';
import { LanguageSelectionStep } from './components/LanguageSelectionStep';
import { OnboardingActions } from './components/OnboardingActions';
import { OnboardingContextRail } from './components/OnboardingContextRail';
import { OnboardingProgress } from './components/OnboardingProgress';
import { OnboardingStepHeader } from './components/OnboardingStepHeader';
import { OptionalDetailsStep } from './components/OptionalDetailsStep';
import { ProficiencyStep } from './components/ProficiencyStep';
import { ONBOARDING_STEPS } from './onboarding.constants';
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
  type DeclaredProficiency,
  type LanguageCatalogItem,
  type LanguageRole,
  type OnboardingApi,
  type OnboardingDraft,
  type ProfileSkill,
} from './onboarding.types';
import styles from './OnboardingPage.module.css';

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
  const currentStep = ONBOARDING_STEPS[draft.step] ?? ONBOARDING_STEPS[0];
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

  function handleSearchChange(value: string): void {
    setSearchValue(value);
    setSearchOpen(Boolean(value.trim()));
    setActiveSearchIndex(0);
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

  function setLevel(code: string, level: DeclaredProficiency): void {
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
      <OnboardingProgress step={draft.step} />

      <div className={styles.onboardingGrid}>
        <div className={styles.formColumn}>
          <OnboardingStepHeader
            step={draft.step}
            eyebrow={currentStep.eyebrow}
            title={currentStep.title}
            description={currentStep.description}
          />

          <form className={styles.onboardingForm} onSubmit={(event) => handleSubmit(event)} noValidate>
            {draft.step === 0 ? (
              <LanguageSelectionStep
                mode='spoken'
                draft={draft}
                catalog={catalog}
                searchId={searchId}
                listId={listId}
                searchRef={searchRef}
                searchValue={searchValue}
                searchOpen={searchOpen}
                activeSearchIndex={activeSearchIndex}
                filteredSearchResults={filteredSearchResults}
                onSearchFocus={() => setSearchOpen(Boolean(searchValue.trim()))}
                onSearchChange={handleSearchChange}
                onSearchKeyDown={handleSearchKeyDown}
                onChooseLanguage={chooseSearchLanguage}
                onRemoveRole={removeRole}
                onToggleRole={toggleRole}
              />
            ) : null}

            {draft.step === 1 ? (
              <LanguageSelectionStep
                mode='learning'
                draft={draft}
                catalog={catalog}
                searchId={searchId}
                listId={listId}
                searchRef={searchRef}
                searchValue={searchValue}
                searchOpen={searchOpen}
                activeSearchIndex={activeSearchIndex}
                filteredSearchResults={filteredSearchResults}
                onSearchFocus={() => setSearchOpen(Boolean(searchValue.trim()))}
                onSearchChange={handleSearchChange}
                onSearchKeyDown={handleSearchKeyDown}
                onChooseLanguage={chooseSearchLanguage}
                onRemoveRole={removeRole}
                onToggleRole={toggleRole}
              />
            ) : null}

            {draft.step === 2 ? (
              <ProficiencyStep draft={draft} catalog={catalog} levelRefs={levelRefs} onSetLevel={setLevel} />
            ) : null}

            {draft.step === 3 ? (
              <GoalsSkillsStep draft={draft} searchId={searchId} onToggleGoal={toggleGoal} onToggleSkill={toggleSkill} />
            ) : null}

            {draft.step === 4 ? (
              <OptionalDetailsStep
                draft={draft}
                interestValue={interestValue}
                availabilityDay={availabilityDay}
                availabilityStart={availabilityStart}
                availabilityEnd={availabilityEnd}
                onInterestChange={setInterestValue}
                onAddInterest={addInterest}
                onRemoveInterest={(interest) => updateDraft((current) => ({
                  ...current,
                  interests: current.interests.filter((item) => item !== interest),
                }))}
                onTimezoneChange={(timezone) => updateDraft((current) => ({ ...current, timezone }))}
                onAvailabilityDayChange={setAvailabilityDay}
                onAvailabilityStartChange={setAvailabilityStart}
                onAvailabilityEndChange={setAvailabilityEnd}
                onAddAvailability={addAvailability}
                onRemoveAvailability={(index) => updateDraft((current) => ({
                  ...current,
                  availability: current.availability.filter((_, itemIndex) => itemIndex !== index),
                }))}
              />
            ) : null}

            {stepError ? <p className={styles.formError} role='alert'>{stepError}</p> : null}
            {saveError ? <p className={styles.formError} role='alert'>{saveError}</p> : null}

            <OnboardingActions
              step={draft.step}
              saving={saving}
              onBack={handleBack}
              onSkip={(event) => handleSubmit(event, true)}
            />
          </form>
        </div>

        <OnboardingContextRail step={draft.step} />
      </div>
    </section>
  );
}

function OnboardingLoading() {
  return (
    <section className={styles.loadingFrame} aria-busy='true' aria-label='Đang tải thiết lập onboarding'>
      <div className={styles.loadingLines}><span /><span /><span /><span /></div>
    </section>
  );
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

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
