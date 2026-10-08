import { languageDisplayName } from '../ui-locale/language-display';
import type { TranslationKey } from '../ui-locale/ui-locale';
import { useUiLocale } from '../ui-locale/UiLocaleProvider';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon/Icon';
import { Avatar, Badge, Chip } from '../../components/ui/Surface';
import { useAuth } from '../auth/AuthProvider';
import { localizedOnboardingOptions } from '../onboarding/onboarding.constants';
import { PROFICIENCY_VALUES } from '../onboarding/onboarding.types';
import type {
  DeclaredProficiency,
  LanguageCatalogItem,
  LanguageRole,
  OwnProfile,
  ProfileLanguageInput,
  ProfileSkill,
  ProfileUpdateInput,
} from '../onboarding/onboarding.types';
import type { PassportApi, PublicProfile } from './passport.types';
import { PassportProgressPanel } from './PassportProgressPanel';
import type { PassportProgressApi } from './passport-progress.types';
import {
  localizedPassportLabels,
  availabilitySummary,
  draftFromProfile,
  formatAvailabilityWindow,
  goalLabel,
  isDeclaredProficiency,
  languageLabel,
  proficiencyLabel,
  profileUpdateFromDraft,
  secondaryLanguageLabel,
  skillLabel,
  timezoneLabel,
  type PassportDraft,
} from './passport.utils';
import styles from './PassportPages.module.css';

type PublicLanguage = PublicProfile['languages'][number];
type OwnLanguage = OwnProfile['languages'][number];
type PassportLanguage = PublicLanguage | OwnLanguage;
type PassportProfile = OwnProfile | PublicProfile;

interface OwnPassportPageProps {
  api?: PassportApi;
  userId?: string;
}

interface PublicPassportPageProps {
  api?: Pick<PassportApi, 'getPublicProfile'>;
  userId?: string;
}

export function OwnPassportPage({ api: providedApi, userId: providedUserId }: OwnPassportPageProps) {
  const { t, locale } = useUiLocale();
  const { GOAL_OPTIONS, SKILL_OPTIONS, TIMEZONES } = localizedOnboardingOptions(locale);
  const auth = useAuth();
  const location = useLocation();
  const api = providedApi ?? auth.api;
  const userId = providedUserId ?? auth.user?.id ?? '';
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [catalog, setCatalog] = useState<LanguageCatalogItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<TranslationKey | ''>('');
  const [saveMessage, setSaveMessage] = useState<TranslationKey | ''>('');
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const profileHeroRef = useRef<HTMLElement>(null);
  const editorSectionRef = useRef<HTMLElement>(null);
  const editorHeadingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusTarget = useRef<'trigger' | null>(null);

  const loadProfile = useCallback(() => {
    if (!userId) return;
    setLoadState('loading');
    Promise.all([
      api.getProfile(),
      api.getLanguages().catch(() => []),
    ])
      .then(([nextProfile, nextCatalog]) => {
        setProfile(nextProfile);
        setCatalog(nextCatalog);
        setLoadState('ready');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, [api, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (editing) {
      editorSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      editorHeadingRef.current?.focus();
      return;
    }

    if (returnFocusTarget.current === 'trigger') {
      profileHeroRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      editTriggerRef.current?.focus();
      returnFocusTarget.current = null;
    }
  }, [editing]);

  if (!providedUserId && auth.status === 'loading') return <PassportLoading label={t('onboarding.loading.language.passport')} />;
  if (!userId) return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  if (loadState === 'loading') return <PassportLoading label={t('onboarding.loading.language.passport')} />;
  if (loadState === 'error' || !profile) {
    return (
      <PassportStateFrame>
        <ErrorState
          title={t('onboarding.unable.to.load.language.passport')}
          description={t('onboarding.your.profile.is.not.ready.try.reloading.to.continue')}
          onRetry={loadProfile}
          retryLabel={t('onboarding.reload.profile')}
        />

      </PassportStateFrame>
    );
  }

  async function saveProfile(input: ProfileUpdateInput): Promise<void> {
    setSaving(true);
    setSaveError('');
    try {
      const nextProfile = await api.updateProfile(input);
      setProfile(nextProfile);
      setSaveMessage('onboarding.changes.saved');
      returnFocusTarget.current = 'trigger';
      setEditing(false);
    } catch {
      setSaveError('onboarding.unable.to.save.changes.right.now');
    } finally {
      setSaving(false);
    }
  }

  function openEditor(): void {
    setSaveError('');
    setSaveMessage('');
    setEditing(true);
  }

  function closeEditor(): void {
    setSaveError('');
    returnFocusTarget.current = 'trigger';
    setEditing(false);
  }

  return (
    <PassportView
      profile={profile}
      isOwner
      progressApi={api}
      editing={editing}
      editTriggerRef={editTriggerRef}
      profileHeroRef={profileHeroRef}
      saveMessage={saveMessage ? t(saveMessage) : ''}
      onEdit={openEditor}
      body={editing ? (
        <PassportEditor
          profile={profile}
          catalog={catalog}
          saving={saving}
          saveError={saveError ? t(saveError) : ''}
          editorSectionRef={editorSectionRef}
          editorHeadingRef={editorHeadingRef}
          onCancel={closeEditor}
          onSave={saveProfile}
        />
      ) : undefined}
    />
  );
}

export function PublicPassportPage({ api: providedApi, userId: providedUserId }: PublicPassportPageProps) {
  const { t, locale } = useUiLocale();
  const auth = useAuth();
  const params = useParams<{ userId: string }>();
  const api = providedApi ?? auth.api;
  const userId = providedUserId ?? params.userId ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadProfile = useCallback(() => {
    if (!userId) return;
    setLoadState('loading');
    api.getPublicProfile(userId)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setLoadState('ready');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, [api, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!userId) {
    return (
      <PassportStateFrame>
        <EmptyState title={t('onboarding.profile.not.found')} description={t('onboarding.this.profile.link.is.missing.information')} />
      </PassportStateFrame>
    );
  }
  if (loadState === 'loading') return <PassportLoading label={t('onboarding.loading.public.profile')} />;
  if (loadState === 'error' || !profile) {
    return (
      <PassportStateFrame>
        <ErrorState
          title={t('onboarding.unable.to.load.public.profile')}
          description={t('onboarding.this.profile.may.have.been.removed.or.is.not.ready.try.reloading')}
          onRetry={loadProfile}
          retryLabel={t('onboarding.reload.profile')}
        />

      </PassportStateFrame>
    );
  }

  return <PassportView profile={profile} isOwner={false} />;
}

interface PassportViewProps {
  profile: PassportProfile;
  isOwner: boolean;
  progressApi?: PassportProgressApi;
  onEdit?: () => void;
  editing?: boolean;
  editTriggerRef?: RefObject<HTMLButtonElement>;
  profileHeroRef?: RefObject<HTMLElement>;
  saveMessage?: string;
  body?: ReactNode;
}

function PassportView({
  profile,
  isOwner,
  progressApi,
  onEdit,
  editing = false,
  editTriggerRef,
  profileHeroRef,
  saveMessage,
  body,
}: PassportViewProps) {
  const { t, locale } = useUiLocale();
  const ownProfile = isOwner ? profile as OwnProfile : null;
  return (
    <section className={styles.passportPage} aria-labelledby='passport-title'>
      <header className={styles.passportHero} ref={profileHeroRef}>
        <div className={styles.identityBlock}>
          <Avatar name={profile.user.displayName} size='lg' />
          <div>
            <p className={styles.eyebrow}>{isOwner ? t('onboarding.your.passport') : t('onboarding.public.passport')}</p>
            <h1 id='passport-title'>{profile.user.displayName}</h1>
            <p className={styles.identitySubtitle}>{t('onboarding.an.open.profile.for.meeting.people.through.language')}</p>
          </div>
        </div>
        {isOwner ? (
          <div className={styles.heroActions}>
            <Button
              ref={editTriggerRef}
              variant='primary'
              className={editing ? styles.editButtonActive : undefined}
              disabled={editing}
              aria-pressed={editing}
              onClick={onEdit}
            >
              <Icon name='user-round' size={18} />
              {editing ? t('onboarding.editing') : t('onboarding.edit.profile')}
            </Button>
            <Link className={styles.quietLink} to={'/profiles/' + encodeURIComponent(profile.user.id)}>
               {t('onboarding.view.public.profile')} </Link>
          </div>
        ) : null}
      </header>

      {saveMessage ? <p className={styles.saveSuccess} role='status'>{saveMessage}</p> : null}

      {body ?? (
        <div className={styles.passportLayout}>
          <div className={styles.passportPrimary}>
            <LanguageSection languages={profile.languages} isOwner={isOwner} />
            {isOwner && progressApi ? <PassportProgressPanel api={progressApi} /> : null}
            <CollectionsSection profile={profile} />
            <InterestsSection profile={profile} />
          </div>

          <aside className={styles.passportRail} aria-label={t('onboarding.connection.and.privacy.information')}>
            <div className={styles.railCard}>
              <div className={styles.railCardHeader}>
                <h2>{t('onboarding.connection.schedule')}</h2>
                <Icon name='compass' size={18} />
              </div>
              {ownProfile ? (
                <>
                  <div className={styles.railHighlight}>
                    <span>{t('onboarding.your.availability')}</span>
                    <strong>{availabilitySummary(ownProfile.availability, locale)}</strong>
                    <small>{timezoneLabel(ownProfile.timezone, locale)}</small>
                  </div>
                  {ownProfile.availability.length > 0 ? (
                    <ul className={styles.railAvailabilityList}>
                      {ownProfile.availability.map((window) => <li key={window.dayOfWeek + '-' + window.startTime + '-' + window.endTime}>{formatAvailabilityWindow(window, locale)}</li>)}
                    </ul>
                  ) : null}
                </>
              ) : (
                <div className={styles.railHighlight}>
                  <span>{t('onboarding.specific.availability')}</span>
                  <strong>{t('onboarding.not.shown.publicly')}</strong>
                  <small>{t('onboarding.this.profile.shows.only.information.allowed.to.be.shared')}</small>
                </div>
              )}
            </div>

            <div className={styles.railCard}>
              <div className={styles.railCardHeader}>
                <h2>{t('onboarding.protecting.your.identity')}</h2>
                <Icon name='lock' size={18} />
              </div>
              <p className={styles.railText}>
                {isOwner
                  ? t('onboarding.you.control.whether.each.language.appears.on.your.public.profile.email.and.account.data.are.not.part.of.your.passport')
                  : t('onboarding.email.provider.identifiers.account.roles.and.private.languages.do.not.appear.here')}
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function LanguageSection({ languages, isOwner }: { languages: PassportLanguage[]; isOwner: boolean }) {
  const { t, locale } = useUiLocale();
  const groups: Array<{ role: LanguageRole; title: string; description: string }> = [
    { role: 'native', title: t('onboarding.native.languages'), description: t('onboarding.languages.that.form.your.foundation') },
    { role: 'known', title: t('onboarding.known.languages'), description: t('onboarding.languages.you.can.use.and.share') },
    { role: 'learning', title: t('onboarding.learning.languages.group'), description: t('onboarding.languages.leading.you.toward.new.goals') },
  ];
  return (
    <section className={styles.passportSection + ' ' + styles.contentCard} aria-labelledby='passport-languages-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>{t('onboarding.languages')}</p>
          <h2 id='passport-languages-title'>{t('onboarding.the.languages.that.make.you.who.you.are')}</h2>
        </div>
        <span className={styles.sectionTools}>
          <span className={styles.sectionCount}>{languages.length} {isOwner ? t('onboarding.language.relationships') : t('onboarding.public.languages')}</span>
          <Icon name='languages' size={20} />
        </span>
      </div>
      <div className={styles.languageGroups}>
        {groups.map((group) => {
          const matching = languages.filter((language) => language.roles.includes(group.role));
          return (
            <div className={styles.languageGroup} key={group.role}>
              <div className={styles.groupHeading}>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              {matching.length > 0 ? (
                <div className={styles.languageList}>
                  {matching.map((language) => <LanguageRow key={language.code + '-' + group.role} language={language} isOwner={isOwner} />)}
                </div>
              ) : (
                <p className={styles.groupEmpty}>{t('onboarding.no.languages.in.this.group.yet')}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LanguageRow({ language, isOwner }: { language: PassportLanguage; isOwner: boolean }) {
  const { t, locale } = useUiLocale();
  const secondary = language.nativeName;
  return (
    <article className={styles.languageRow} dir={language.direction}>
      <div className={styles.languageName}>
        <strong>{languageDisplayName(language, locale)}</strong>
        <span>{secondary || language.code.toUpperCase()}</span>
      </div>
      <div className={styles.languageMeta}>
        <Badge tone='info'>{proficiencyLabel(language.declaredProficiency, locale)}</Badge>
        {language.assessedProficiency ? <Badge tone='success'>{t('onboarding.assessed')} {language.assessedProficiency}</Badge> : null}
        {language.isPrimaryLearningTarget ? <Badge tone='warning'>{t('onboarding.primary.target')}</Badge> : null}
        {isOwner && 'visibility' in language ? (
          <Badge tone={language.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
            {language.visibility === 'PUBLIC' ? t('onboarding.public') : t('onboarding.private')}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

function CollectionsSection({ profile }: { profile: PassportProfile }) {
  const { t, locale } = useUiLocale();
  return (
    <section className={styles.passportSection + ' ' + styles.contentCard} aria-labelledby='passport-collections-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>{t('onboarding.what.you.want.to.take.with.you')}</p>
          <h2 id='passport-collections-title'>{t('onboarding.goals.skills.and.interests')}</h2>
        </div>
        <Icon name='sparkles' size={24} />
      </div>
      <div className={styles.collectionGrid}>
        <CollectionList title={t('onboarding.learning.goals.section')} values={profile.goals.map((goal) => goalLabel(goal, locale))} empty={t('onboarding.no.goals.added.yet')} />
        <CollectionList title={t('onboarding.priority.skills')} values={profile.skills.map((skill) => skillLabel(skill, locale))} empty={t('onboarding.no.skills.selected.yet')} />
      </div>
    </section>
  );
}

function InterestsSection({ profile }: { profile: PassportProfile }) {
  const { t, locale } = useUiLocale();
  return (
    <section className={styles.passportSection + ' ' + styles.contentCard} aria-labelledby='passport-interests-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>{t('onboarding.conversation.starters')}</p>
          <h2 id='passport-interests-title'>{t('onboarding.interests.and.things.to.share')}</h2>
        </div>
        <Icon name='users' size={20} />
      </div>
      <div className={styles.interestDisplay}>
        {profile.interests.length > 0
          ? profile.interests.map((interest) => <span className={styles.displayChip} key={interest}>{interest}</span>)
          : <p className={styles.mutedText}>{t('onboarding.no.interests.added.yet')}</p>}
      </div>
    </section>
  );
}

function CollectionList({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  const { t, locale } = useUiLocale();
  return (
    <div className={styles.collectionBlock}>
      <h3>{title}</h3>
      {values.length > 0 ? (
        <ul className={styles.chipList}>
          {values.map((value) => <li key={value}><span className={styles.displayChip}>{value}</span></li>)}
        </ul>
      ) : <p className={styles.mutedText}>{empty}</p>}
    </div>
  );
}

function PassportEditor({
  profile,
  catalog,
  saving,
  saveError,
  editorSectionRef,
  editorHeadingRef,
  onCancel,
  onSave,
}: {
  profile: OwnProfile;
  catalog: LanguageCatalogItem[];
  saving: boolean;
  saveError: string;
  editorSectionRef: RefObject<HTMLElement>;
  editorHeadingRef: RefObject<HTMLHeadingElement>;
  onCancel: () => void;
  onSave: (input: ProfileUpdateInput) => Promise<void>;
}) {
  const { t, locale } = useUiLocale();
  const { DAY_LABELS, ROLE_LABELS, PROFICIENCY_LABELS } = localizedPassportLabels(locale);
  const { GOAL_OPTIONS, SKILL_OPTIONS, TIMEZONES } = localizedOnboardingOptions(locale);
  const [draft, setDraft] = useState<PassportDraft>(() => draftFromProfile(profile));
  const [interestValue, setInterestValue] = useState('');
  const [newDay, setNewDay] = useState(2);
  const [newStart, setNewStart] = useState('19:00');
  const [newEnd, setNewEnd] = useState('20:00');
  const [formError, setFormError] = useState<TranslationKey | ''>('');
  const catalogByCode = useMemo(() => new Map(catalog.map((language) => [language.code, language])), [catalog]);
  const availableLanguages = catalog.filter((language) => !draft.languages.some((item) => item.languageCode === language.code));

  function setDraftValue(next: Partial<PassportDraft>): void {
    setDraft((current) => ({ ...current, ...next }));
    setFormError('');
  }

  function updateLanguage(index: number, next: Partial<ProfileLanguageInput>): void {
    setDraftValue({ languages: draft.languages.map((language, itemIndex) => itemIndex === index ? { ...language, ...next } : language) });
  }

  function toggleRole(index: number, role: LanguageRole): void {
    const current = draft.languages[index];
    if (!current) return;
    const roles = current.roles.includes(role)
      ? current.roles.filter((item) => item !== role)
      : [...current.roles, role];
    const nextLevel = roles.includes('native')
      ? 'NATIVE'
      : current.declaredProficiency === 'NATIVE' ? 'A1' : current.declaredProficiency;
    updateLanguage(index, {
      roles,
      declaredProficiency: nextLevel,
      isPrimaryLearningTarget: roles.includes('learning') ? current.isPrimaryLearningTarget : false,
    });
  }

  function setPrimary(index: number, checked: boolean): void {
    setDraftValue({
      languages: draft.languages.map((language, itemIndex) => ({
        ...language,
        isPrimaryLearningTarget: checked ? itemIndex === index : itemIndex === index ? false : language.isPrimaryLearningTarget,
      })),
    });
  }

  function addLanguage(code: string): void {
    if (!code || draft.languages.some((language) => language.languageCode === code)) return;
    setDraftValue({
      languages: [...draft.languages, {
        languageCode: code,
        roles: ['learning'],
        declaredProficiency: 'A1',
        isPrimaryLearningTarget: draft.languages.every((language) => !language.isPrimaryLearningTarget),
        visibility: 'PUBLIC',
      }],
    });
  }

  function addInterest(): void {
    const value = interestValue.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!value || draft.interests.includes(value)) return;
    setDraftValue({ interests: [...draft.interests, value] });
    setInterestValue('');
  }

  function handleInterestKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      addInterest();
    }
  }

  function addAvailability(): void {
    if (timeToMinutes(newStart) >= timeToMinutes(newEnd)) {
      setFormError('onboarding.the.end.time.must.be.later.than.the.start.time');
      return;
    }
    setDraftValue({ availability: [...draft.availability, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }] });
  }

  function validate(): TranslationKey | '' {
    if (draft.languages.some((language) => language.roles.length === 0)) return 'onboarding.each.language.needs.at.least.one.role';
    if (draft.languages.some((language) => (language.roles.includes('native')) !== (language.declaredProficiency === 'NATIVE'))) {
      return 'onboarding.native.proficiency.must.have.the.native.role';
    }
    if (draft.languages.filter((language) => language.isPrimaryLearningTarget).length > 1) return 'onboarding.choose.only.one.primary.learning.target';
    return '';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    void onSave(profileUpdateFromDraft(draft));
  }

  const goalValues = Array.from(new Set([...GOAL_OPTIONS.map((option) => option.value), ...draft.goals]));
  return (
    <section ref={editorSectionRef} className={styles.editorFrame} aria-labelledby='passport-editor-title'>
      <div className={styles.editorIdentityContext}>
        <Avatar name={profile.user.displayName} size='sm' />
        <span>{t('onboarding.profile.being.edited')} <strong>{profile.user.displayName}</strong></span>
      </div>
      <p className={styles.editModeNotice} role='status'>{t('onboarding.you.are.editing.your.profile')}</p>
      <div className={styles.editorHeader}>
        <div>
          <p className={styles.eyebrow}>{t('onboarding.edit')}</p>
          <h2 ref={editorHeadingRef} id='passport-editor-title' tabIndex={-1}>{t('onboarding.update.your.language.journey')}</h2>
        </div>
        <Button variant='quiet' onClick={onCancel}>{t('onboarding.close')}</Button>
      </div>
      <form className={styles.editorForm} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.editorFieldset}>
          <legend>{t('onboarding.languages.and.privacy')}</legend>
          <p className={styles.fieldHint}>{t('onboarding.choose.roles.self.assessed.proficiency.and.whether.this.language.appears.on.your.public.profile')}</p>
          <div className={styles.editorLanguageList}>
            {draft.languages.map((language, index) => {
              const catalogItem = catalogByCode.get(language.languageCode);
              const label = languageLabel(catalogItem, language.languageCode, locale);
              return (
                <article className={styles.editorLanguage} key={language.languageCode}>
                  <div className={styles.editorLanguageHeading}>
                    <div>
                      <h3>{label}</h3>
                      <p>{secondaryLanguageLabel(catalogItem, language.languageCode)}</p>
                    </div>
                    <button className={styles.removeButton} type='button' onClick={() => setDraftValue({ languages: draft.languages.filter((_, itemIndex) => itemIndex !== index) })} aria-label={t('onboarding.remove') + label}>
                      <Icon name='x' size={18} />
                    </button>
                  </div>
                  <div className={styles.roleChoices} role='group' aria-label={t('onboarding.roles.for') + label}>
                    {(['native', 'known', 'learning'] as LanguageRole[]).map((role) => (
                      <label className={styles.checkboxLabel} key={role}>
                        <input type='checkbox' checked={language.roles.includes(role)} onChange={() => toggleRole(index, role)} />
                        {ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                  <div className={styles.editorControls}>
                    <label className={styles.fieldLabel}>
                       {t('onboarding.self.assessed.proficiency')} <select value={language.declaredProficiency} onChange={(event) => {
                        const value = event.target.value;
                        if (isDeclaredProficiency(value)) updateLanguage(index, { declaredProficiency: value });
                      }}>
                        {PROFICIENCY_VALUES.filter((value) => value !== 'NATIVE' || language.roles.includes('native')).map((value) => <option key={value} value={value}>{PROFICIENCY_LABELS[value]}</option>)}
                      </select>
                    </label>
                    <label className={styles.fieldLabel}>
                       {t('onboarding.profile.visibility')} <select value={language.visibility ?? 'PUBLIC'} onChange={(event) => updateLanguage(index, { visibility: event.target.value as 'PUBLIC' | 'PRIVATE' })}>
                        <option value='PUBLIC'>{t('onboarding.public')}</option>
                        <option value='PRIVATE'>{t('onboarding.private')}</option>
                      </select>
                    </label>
                  </div>
                  {language.roles.includes('learning') ? (
                    <label className={styles.checkboxLabel}>
                      <input type='checkbox' checked={Boolean(language.isPrimaryLearningTarget)} onChange={(event) => setPrimary(index, event.target.checked)} />
                       {t('onboarding.this.is.my.primary.learning.target')} </label>
                  ) : null}
                </article>
              );
            })}
          </div>
          {availableLanguages.length > 0 ? (
            <label className={styles.fieldLabel}>
               {t('onboarding.add.a.language')} <select value='' onChange={(event) => addLanguage(event.target.value)}>
                <option value=''>{t('onboarding.choose.from.the.list')}</option>
                {availableLanguages.map((language) => <option key={language.code} value={language.code}>{languageDisplayName(language, locale)} · {language.nativeName}</option>)}
              </select>
            </label>
          ) : null}
        </fieldset>

        <fieldset className={styles.editorFieldset}>
          <legend>{t('onboarding.goals.and.skills')}</legend>
          <div className={styles.editorChoiceGrid}>
            <div>
              <h3>{t('onboarding.learning.goals.section')}</h3>
              <div className={styles.choiceList}>
                {goalValues.map((goal) => (
                  <label className={styles.checkboxLabel} key={goal}>
                    <input type='checkbox' checked={draft.goals.includes(goal)} onChange={() => setDraftValue({ goals: draft.goals.includes(goal) ? draft.goals.filter((item) => item !== goal) : [...draft.goals, goal] })} />
                    {goalLabel(goal, locale)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3>{t('onboarding.priority.skills')}</h3>
              <div className={styles.choiceList}>
                {SKILL_OPTIONS.map((skill) => (
                  <label className={styles.checkboxLabel} key={skill.value}>
                    <input type='checkbox' checked={draft.skills.includes(skill.value)} onChange={() => setDraftValue({ skills: draft.skills.includes(skill.value) ? draft.skills.filter((item) => item !== skill.value) : [...draft.skills, skill.value] })} />
                    {skill.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.editorFieldset}>
          <legend>{t('onboarding.interests.and.learning.schedule')}</legend>
          <label className={styles.fieldLabel}>
             {t('onboarding.interests')} <div className={styles.inlineField}>
              <input value={interestValue} onChange={(event) => setInterestValue(event.target.value)} onKeyDown={handleInterestKeyDown} placeholder={t('onboarding.for.example.music')} />
              <Button variant='quiet' size='sm' type='button' onClick={addInterest}>{t('onboarding.add')}</Button>
            </div>
          </label>
          {draft.interests.length > 0 ? <div className={styles.editorChips}>{draft.interests.map((interest) => <Chip key={interest} onRemove={() => setDraftValue({ interests: draft.interests.filter((item) => item !== interest) })}>{interest}</Chip>)}</div> : null}
          <div className={styles.editorControls}>
            <label className={styles.fieldLabel}>
               {t('onboarding.timezone')} <select value={draft.timezone ?? ''} onChange={(event) => setDraftValue({ timezone: event.target.value || null })}>
                <option value=''>{t('onboarding.not.selected')}</option>
                {draft.timezone && !TIMEZONES.some((timezone) => timezone.value === draft.timezone) ? <option value={draft.timezone}>{draft.timezone}</option> : null}
                {TIMEZONES.map((timezone) => <option key={timezone.value} value={timezone.value}>{timezone.label}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.availabilityEditor}>
            <h3>{t('onboarding.available.times.to.connect')}</h3>
            {draft.availability.length > 0 ? (
              <ul className={styles.availabilityEditList}>
                {draft.availability.map((window, index) => (
                  <li key={window.dayOfWeek + '-' + index}>
                    <span>{formatAvailabilityWindow(window, locale)}</span>
                    <button className={styles.removeButton} type='button' onClick={() => setDraftValue({ availability: draft.availability.filter((_, itemIndex) => itemIndex !== index) })} aria-label={t('onboarding.remove.time.window') + (index + 1)}><Icon name='x' size={16} /></button>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.mutedText}>{t('onboarding.no.availability.added.yet')}</p>}
            <div className={styles.availabilityAddRow}>
              <label className={styles.fieldLabel}>{t('onboarding.day')}<select value={newDay} onChange={(event) => setNewDay(Number(event.target.value))}>{Object.entries(DAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className={styles.fieldLabel}>{t('onboarding.start')}<input type='time' value={newStart} onChange={(event) => setNewStart(event.target.value)} /></label>
              <label className={styles.fieldLabel}>{t('onboarding.end')}<input type='text' inputMode='numeric' pattern='^([01][0-9]|2[0-3]):[0-5][0-9]|24:00$' value={newEnd} onChange={(event) => setNewEnd(event.target.value)} /></label>
              <Button variant='quiet' size='sm' type='button' onClick={addAvailability}>{t('onboarding.add.time')}</Button>
            </div>
          </div>
        </fieldset>

        {formError ? <p className={styles.formError} role='alert'>{t(formError)}</p> : null}
        {saveError ? <p className={styles.formError} role='alert'>{saveError}</p> : null}
        <div className={styles.editorActions}>
          <Button variant='quiet' type='button' onClick={onCancel}>{t('onboarding.cancel')}</Button>
          <Button variant='primary' type='submit' loading={saving}>{t('onboarding.save.changes')}</Button>
        </div>
      </form>
    </section>
  );
}

function PassportLoading({ label }: { label: string }) {
  const { t, locale } = useUiLocale();
  return (
    <PassportStateFrame>
      <div className={styles.loadingState} aria-busy='true' aria-label={label}>
        <span /><span /><span /><span />
      </div>
    </PassportStateFrame>
  );
}

function PassportStateFrame({ children }: { children: ReactNode }) {
  const { t, locale } = useUiLocale();
  return <section className={styles.stateFrame} aria-labelledby='passport-state-title'><h1 className={styles.screenReaderOnly} id='passport-state-title'>{t('onboarding.language.passport')}</h1>{children}</section>;
}

function timeToMinutes(value: string): number {
  if (value === '24:00') return 1440;
  const [hour, minute] = value.split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}
