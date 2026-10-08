import type { TranslationKey } from '../ui-locale/ui-locale';
import { useUiLocale } from '../ui-locale/UiLocaleProvider';
import { useCallback, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
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
import { useLanguagePicker } from './hooks/useLanguagePicker';
import { useOnboardingHistory } from './hooks/useOnboardingHistory';
import { useOnboardingSession } from './hooks/useOnboardingSession';
import { localizedOnboardingOptions } from './onboarding.constants';
import {
  buildProfileUpdate,
  isOnboardingComplete,
  markOnboardingComplete,
  toggleCode,
  validateDraftForStep,
} from './onboarding-state';
import {
  ONBOARDING_STEP_COUNT,
  type DeclaredProficiency,
  type LanguageRole,
  type OnboardingApi,
  type OnboardingDraft,
  type ProfileSkill,
} from './onboarding.types';
import { getClientStorage, timeToMinutes, unique } from './onboarding.utils';
import styles from './OnboardingPage.module.css';

interface OnboardingPageProps {
  api?: OnboardingApi;
  userId?: string;
}

export function OnboardingPage({ api: providedApi, userId: providedUserId }: OnboardingPageProps) {
  const { t, locale } = useUiLocale();
  const { ONBOARDING_STEPS } = localizedOnboardingOptions(locale);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onboardingApi = providedApi ?? auth.api;
  const resolvedUserId = providedUserId ?? auth.user?.id ?? '';
  const storage = useMemo(getClientStorage, []);
  const [stepError, setStepError] = useState<TranslationKey | ''>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<TranslationKey | ''>('');
  const [interestValue, setInterestValue] = useState('');
  const [availabilityDay, setAvailabilityDay] = useState(2);
  const [availabilityStart, setAvailabilityStart] = useState('19:00');
  const [availabilityEnd, setAvailabilityEnd] = useState('20:00');
  const levelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const completeNavigation = useCallback(() => {
    navigate('/', { replace: true, state: { from: location.pathname } });
  }, [location.pathname, navigate]);

  const {
    catalog,
    draft,
    loadData,
    loadError,
    loadState,
    setDraft,
  } = useOnboardingSession({
    api: onboardingApi,
    userId: resolvedUserId,
    storage,
    onProfileComplete: completeNavigation,
  });

  const updateDraft = useCallback((updater: (current: OnboardingDraft) => OnboardingDraft): void => {
    setDraft((current) => updater(current));
    setStepError('');
    setSaveError('');
  }, [setDraft]);

  const toggleRole = useCallback((code: string, role: LanguageRole): void => {
    updateDraft((current) => {
      const field = role === 'native' ? 'nativeCodes' : role === 'known' ? 'knownCodes' : 'learningCodes';
      return { ...current, [field]: toggleCode(current[field], code) };
    });
  }, [updateDraft]);

  const removeRole = useCallback((code: string, role: LanguageRole): void => {
    updateDraft((current) => {
      const field = role === 'native' ? 'nativeCodes' : role === 'known' ? 'knownCodes' : 'learningCodes';
      return { ...current, [field]: current[field].filter((item) => item !== code) };
    });
  }, [updateDraft]);

  const languagePicker = useLanguagePicker({ catalog, step: draft.step, onToggleRole: toggleRole });
  const changeStep = useCallback((step: number) => {
    setDraft((current) => ({ ...current, step }));
  }, [setDraft]);
  const clearStepError = useCallback(() => setStepError(''), []);
  const exitOnboarding = useCallback(() => navigate('/'), [navigate]);
  const onboardingHistory = useOnboardingHistory({
    step: draft.step,
    ready: loadState === 'ready',
    onStepChange: changeStep,
    onClearError: clearStepError,
    onResetSearch: languagePicker.resetSearch,
    onExit: exitOnboarding,
  });

  const currentStep = ONBOARDING_STEPS[draft.step] ?? ONBOARDING_STEPS[0];
  const storageComplete = isOnboardingComplete(storage, resolvedUserId);

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
      setStepError('onboarding.the.end.time.must.be.later.than.the.start.time');
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
      completeNavigation();
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) void auth.refresh().catch(() => undefined);
      setSaveError('onboarding.unable.to.save.setup.right.now.check.your.connection.and.try.again');
    } finally {
      setSaving(false);
    }
  }

  function focusFirstInvalid(errors: ReturnType<typeof validateDraftForStep>): void {
    if (errors.spokenLanguages || errors.learningLanguages) {
      languagePicker.searchRef.current?.focus();
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

  function handleSubmit(event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>, skipOptional = false): void {
    event.preventDefault();
    const validationStep = skipOptional ? 3 : draft.step;
    const errors = validateDraftForStep(draft, validationStep, true);
    const firstError = errors.spokenLanguages ?? errors.learningLanguages ?? errors.levels ?? errors.goals ?? errors.skills ?? errors.availability;
    if (firstError) {
      setStepError(firstError as TranslationKey);
      focusFirstInvalid(errors);
      return;
    }
    if (draft.step < ONBOARDING_STEP_COUNT - 1 && !skipOptional) {
      onboardingHistory.advance();
      return;
    }
    void finish();
  }

  if (storageComplete) return <Navigate to='/' replace state={{ from: location.pathname }} />;
  if (!providedUserId && auth.status === 'loading') return <OnboardingLoading />;
  if (!resolvedUserId) return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  if (loadState === 'loading') return <OnboardingLoading />;
  if (loadState === 'error') {
    return (
      <section className={styles.loadingFrame} aria-labelledby='onboarding-load-error'>
        <ErrorState
          title={t('onboarding.unable.to.load.languages')}
          description={t('onboarding.the.language.list.or.your.profile.is.not.ready.reload.to.continue.setup')}
          onRetry={loadData}
          retryLabel={t('onboarding.reload.languages')}
        />
        <p className={styles.srOnly} id='onboarding-load-error'>{t('onboarding.unable.to.load.languages')}</p>
      </section>
    );
  }

  const languageStepMode = draft.step === 1 ? 'learning' : 'spoken';

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
            {draft.step <= 1 ? (
              <LanguageSelectionStep
                mode={languageStepMode}
                errorId={stepError ? 'onboarding-step-error' : undefined}
                draft={draft}
                catalog={catalog}
                searchId={languagePicker.searchId}
                listId={languagePicker.listId}
                searchRef={languagePicker.searchRef}
                searchValue={languagePicker.searchValue}
                searchOpen={languagePicker.searchOpen}
                activeSearchIndex={languagePicker.activeSearchIndex}
                filteredSearchResults={languagePicker.filteredSearchResults}
                onSearchFocus={languagePicker.handleSearchFocus}
                onSearchChange={languagePicker.handleSearchChange}
                onSearchKeyDown={languagePicker.handleSearchKeyDown}
                onChooseLanguage={languagePicker.chooseSearchLanguage}
                onRemoveRole={removeRole}
                onToggleRole={toggleRole}
              />
            ) : null}

            {draft.step === 2 ? (
              <ProficiencyStep draft={draft} catalog={catalog} levelRefs={levelRefs} onSetLevel={setLevel} />
            ) : null}

            {draft.step === 3 ? (
              <GoalsSkillsStep draft={draft} searchId={languagePicker.searchId} onToggleGoal={toggleGoal} onToggleSkill={toggleSkill} />
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

            {stepError ? <p className={styles.formError} id='onboarding-step-error' role='alert'>{t(stepError)}</p> : null}
            {saveError ? <p className={styles.formError} role='alert'>{t(saveError)}</p> : null}

            <OnboardingActions
              step={draft.step}
              saving={saving}
              onBack={onboardingHistory.back}
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
  const { t, locale } = useUiLocale();
  return (
    <section className={styles.loadingFrame} aria-busy='true' aria-label={t('onboarding.loading.onboarding.setup')}>
      <div className={styles.loadingLines}><span /><span /><span /><span /></div>
    </section>
  );
}
