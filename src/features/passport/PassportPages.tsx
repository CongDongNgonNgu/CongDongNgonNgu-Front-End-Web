import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon/Icon';
import { Avatar, Badge, Chip } from '../../components/ui/Surface';
import { useAuth } from '../auth/AuthProvider';
import { GOAL_OPTIONS, SKILL_OPTIONS, TIMEZONES } from '../onboarding/onboarding.constants';
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
import {
  availabilitySummary,
  DAY_LABELS,
  draftFromProfile,
  formatAvailabilityWindow,
  goalLabel,
  isDeclaredProficiency,
  languageLabel,
  PROFICIENCY_LABELS,
  proficiencyLabel,
  profileUpdateFromDraft,
  ROLE_LABELS,
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
  const auth = useAuth();
  const location = useLocation();
  const api = providedApi ?? auth.api;
  const userId = providedUserId ?? auth.user?.id ?? '';
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [catalog, setCatalog] = useState<LanguageCatalogItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadProfile = useCallback(() => {
    if (!userId) return;
    setLoadState('loading');
    setLoadError('');
    Promise.all([
      api.getProfile(),
      api.getLanguages().catch(() => []),
    ])
      .then(([nextProfile, nextCatalog]) => {
        setProfile(nextProfile);
        setCatalog(nextCatalog);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setLoadState('error');
        setLoadError(error instanceof Error ? error.message : 'Unable to load the language passport.');
      });
  }, [api, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!providedUserId && auth.status === 'loading') return <PassportLoading label='Đang tải hộ chiếu ngôn ngữ' />;
  if (!userId) return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  if (loadState === 'loading') return <PassportLoading label='Đang tải hộ chiếu ngôn ngữ' />;
  if (loadState === 'error' || !profile) {
    return (
      <PassportStateFrame>
        <ErrorState
          title='Chưa tải được hộ chiếu ngôn ngữ'
          description='Hồ sơ của bạn chưa sẵn sàng. Hãy thử tải lại để tiếp tục.'
          onRetry={loadProfile}
          retryLabel='Tải lại hồ sơ'
        />
        <p className={styles.screenReaderOnly}>{loadError}</p>
      </PassportStateFrame>
    );
  }

  async function saveProfile(input: ProfileUpdateInput): Promise<void> {
    setSaving(true);
    setSaveError('');
    try {
      const nextProfile = await api.updateProfile(input);
      setProfile(nextProfile);
      setEditing(false);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Chưa thể lưu thay đổi lúc này.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PassportView
        profile={profile}
        isOwner
        onEdit={() => { setSaveError(''); setEditing(true); }}
      />
      {editing ? (
        <PassportEditor
          profile={profile}
          catalog={catalog}
          saving={saving}
          saveError={saveError}
          onCancel={() => { setSaveError(''); setEditing(false); }}
          onSave={saveProfile}
        />
      ) : null}
    </>
  );
}

export function PublicPassportPage({ api: providedApi, userId: providedUserId }: PublicPassportPageProps) {
  const auth = useAuth();
  const params = useParams<{ userId: string }>();
  const api = providedApi ?? auth.api;
  const userId = providedUserId ?? params.userId ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');

  const loadProfile = useCallback(() => {
    if (!userId) return;
    setLoadState('loading');
    setLoadError('');
    api.getPublicProfile(userId)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setLoadState('error');
        setLoadError(error instanceof Error ? error.message : 'Unable to load the public passport.');
      });
  }, [api, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!userId) {
    return (
      <PassportStateFrame>
        <EmptyState title='Không tìm thấy hồ sơ' description='Liên kết hồ sơ này chưa có đủ thông tin.' />
      </PassportStateFrame>
    );
  }
  if (loadState === 'loading') return <PassportLoading label='Đang tải hồ sơ công khai' />;
  if (loadState === 'error' || !profile) {
    return (
      <PassportStateFrame>
        <ErrorState
          title='Chưa tải được hồ sơ công khai'
          description='Hồ sơ có thể đã bị gỡ hoặc chưa sẵn sàng. Hãy thử tải lại.'
          onRetry={loadProfile}
          retryLabel='Tải lại hồ sơ'
        />
        <p className={styles.screenReaderOnly}>{loadError}</p>
      </PassportStateFrame>
    );
  }

  return <PassportView profile={profile} isOwner={false} />;
}

function PassportView({
  profile,
  isOwner,
  onEdit,
}: {
  profile: PassportProfile;
  isOwner: boolean;
  onEdit?: () => void;
}) {
  const ownProfile = isOwner ? profile as OwnProfile : null;
  return (
    <section className={styles.passportPage} aria-labelledby='passport-title'>
      <header className={styles.passportHero}>
        <div className={styles.identityBlock}>
          <Avatar name={profile.user.displayName} size='lg' />
          <div>
            <p className={styles.eyebrow}>{isOwner ? 'Hộ chiếu của bạn' : 'Hộ chiếu công khai'}</p>
            <h1 id='passport-title'>{profile.user.displayName}</h1>
            <p className={styles.identitySubtitle}>Một hồ sơ mở cho những cuộc gặp gỡ qua ngôn ngữ.</p>
          </div>
        </div>
        {isOwner ? (
          <div className={styles.heroActions}>
            <Button variant='primary' onClick={onEdit}>
              <Icon name='user-round' size={18} />
              Chỉnh sửa hồ sơ
            </Button>
            <Link className={styles.quietLink} to={'/profiles/' + encodeURIComponent(profile.user.id)}>
              Xem hồ sơ công khai
            </Link>
          </div>
        ) : null}
      </header>

      <div className={styles.passportLayout}>
        <div className={styles.passportPrimary}>
          <LanguageSection languages={profile.languages} isOwner={isOwner} />
          <CollectionsSection profile={profile} />
          <InterestsSection profile={profile} />
        </div>

        <aside className={styles.passportRail} aria-label='Thông tin kết nối và riêng tư'>
          <div className={styles.railCard}>
            <div className={styles.railCardHeader}>
              <h2>Nhịp kết nối</h2>
              <Icon name='compass' size={18} />
            </div>
            {ownProfile ? (
              <>
                <div className={styles.railHighlight}>
                  <span>Khung giờ của bạn</span>
                  <strong>{availabilitySummary(ownProfile.availability)}</strong>
                  <small>{timezoneLabel(ownProfile.timezone)}</small>
                </div>
                {ownProfile.availability.length > 0 ? (
                  <ul className={styles.railAvailabilityList}>
                    {ownProfile.availability.map((window) => <li key={window.dayOfWeek + '-' + window.startTime + '-' + window.endTime}>{formatAvailabilityWindow(window)}</li>)}
                  </ul>
                ) : null}
              </>
            ) : (
              <div className={styles.railHighlight}>
                <span>Khung giờ cụ thể</span>
                <strong>Không hiển thị công khai</strong>
                <small>Hồ sơ này chỉ mở những nội dung được phép chia sẻ.</small>
              </div>
            )}
          </div>

          <div className={styles.railCard}>
            <div className={styles.railCardHeader}>
              <h2>Bảo vệ danh tính</h2>
              <Icon name='lock' size={18} />
            </div>
            <p className={styles.railText}>
              {isOwner
                ? 'Bạn kiểm soát việc từng ngôn ngữ xuất hiện trên hồ sơ công khai. Email và dữ liệu tài khoản không thuộc hộ chiếu.'
                : 'Email, mã nhà cung cấp, vai trò tài khoản và ngôn ngữ riêng tư không xuất hiện ở đây.'}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LanguageSection({ languages, isOwner }: { languages: PassportLanguage[]; isOwner: boolean }) {
  const groups: Array<{ role: LanguageRole; title: string; description: string }> = [
    { role: 'native', title: 'Ngôn ngữ bản ngữ', description: 'Những ngôn ngữ tạo nên nền tảng của bạn.' },
    { role: 'known', title: 'Ngôn ngữ đã biết', description: 'Những ngôn ngữ bạn có thể sử dụng và chia sẻ.' },
    { role: 'learning', title: 'Ngôn ngữ đang học', description: 'Những ngôn ngữ đang dẫn bạn đến mục tiêu mới.' },
  ];
  return (
    <section className={styles.passportSection + ' ' + styles.contentCard} aria-labelledby='passport-languages-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Ngôn ngữ</p>
          <h2 id='passport-languages-title'>Những ngôn ngữ tạo nên bạn</h2>
        </div>
        <span className={styles.sectionTools}>
          <span className={styles.sectionCount}>{languages.length} {isOwner ? 'mối quan hệ' : 'ngôn ngữ công khai'}</span>
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
                <p className={styles.groupEmpty}>Chưa có ngôn ngữ trong nhóm này.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LanguageRow({ language, isOwner }: { language: PassportLanguage; isOwner: boolean }) {
  const secondary = [language.vietnameseName, language.englishName]
    .filter((name, index, names) => Boolean(name) && names.indexOf(name) === index && name !== language.nativeName)
    .join(' · ');
  return (
    <article className={styles.languageRow} dir={language.direction}>
      <div className={styles.languageName}>
        <strong>{language.nativeName}</strong>
        <span>{secondary || language.code.toUpperCase()}</span>
      </div>
      <div className={styles.languageMeta}>
        <Badge tone='info'>{proficiencyLabel(language.declaredProficiency)}</Badge>
        {language.assessedProficiency ? <Badge tone='success'>Đã đánh giá {language.assessedProficiency}</Badge> : null}
        {language.isPrimaryLearningTarget ? <Badge tone='warning'>Mục tiêu chính</Badge> : null}
        {isOwner && 'visibility' in language ? (
          <Badge tone={language.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
            {language.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

function CollectionsSection({ profile }: { profile: PassportProfile }) {
  return (
    <section className={styles.passportSection + ' ' + styles.contentCard} aria-labelledby='passport-collections-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Điều bạn muốn mang theo</p>
          <h2 id='passport-collections-title'>Mục tiêu, kỹ năng và sở thích</h2>
        </div>
        <Icon name='sparkles' size={24} />
      </div>
      <div className={styles.collectionGrid}>
        <CollectionList title='Mục tiêu học' values={profile.goals.map(goalLabel)} empty='Chưa thêm mục tiêu.' />
        <CollectionList title='Kỹ năng ưu tiên' values={profile.skills.map(skillLabel)} empty='Chưa chọn kỹ năng.' />
      </div>
    </section>
  );
}

function InterestsSection({ profile }: { profile: PassportProfile }) {
  return (
    <section className={styles.passportSection + ' ' + styles.contentCard} aria-labelledby='passport-interests-title'>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Chủ đề mở lời</p>
          <h2 id='passport-interests-title'>Sở thích và điều muốn chia sẻ</h2>
        </div>
        <Icon name='users' size={20} />
      </div>
      <div className={styles.interestDisplay}>
        {profile.interests.length > 0
          ? profile.interests.map((interest) => <span className={styles.displayChip} key={interest}>{interest}</span>)
          : <p className={styles.mutedText}>Chưa thêm sở thích.</p>}
      </div>
    </section>
  );
}

function CollectionList({ title, values, empty }: { title: string; values: string[]; empty: string }) {
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
  onCancel,
  onSave,
}: {
  profile: OwnProfile;
  catalog: LanguageCatalogItem[];
  saving: boolean;
  saveError: string;
  onCancel: () => void;
  onSave: (input: ProfileUpdateInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PassportDraft>(() => draftFromProfile(profile));
  const [interestValue, setInterestValue] = useState('');
  const [newDay, setNewDay] = useState(2);
  const [newStart, setNewStart] = useState('19:00');
  const [newEnd, setNewEnd] = useState('20:00');
  const [formError, setFormError] = useState('');
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
      setFormError('Thời gian kết thúc cần muộn hơn thời gian bắt đầu.');
      return;
    }
    setDraftValue({ availability: [...draft.availability, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }] });
  }

  function validate(): string {
    if (draft.languages.some((language) => language.roles.length === 0)) return 'Mỗi ngôn ngữ cần ít nhất một vai trò.';
    if (draft.languages.some((language) => (language.roles.includes('native')) !== (language.declaredProficiency === 'NATIVE'))) {
      return 'Mức bản ngữ cần đi cùng vai trò bản ngữ.';
    }
    if (draft.languages.filter((language) => language.isPrimaryLearningTarget).length > 1) return 'Chỉ chọn một mục tiêu học chính.';
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
    <section className={styles.editorFrame} aria-labelledby='passport-editor-title'>
      <div className={styles.editorHeader}>
        <div>
          <p className={styles.eyebrow}>Chỉnh sửa</p>
          <h2 id='passport-editor-title'>Cập nhật những điều thuộc về hành trình ngôn ngữ</h2>
        </div>
        <Button variant='quiet' onClick={onCancel}>Đóng</Button>
      </div>
      <form className={styles.editorForm} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.editorFieldset}>
          <legend>Ngôn ngữ và quyền riêng tư</legend>
          <p className={styles.fieldHint}>Chọn vai trò, mức tự đánh giá và việc ngôn ngữ này có xuất hiện trên hồ sơ công khai hay không.</p>
          <div className={styles.editorLanguageList}>
            {draft.languages.map((language, index) => {
              const catalogItem = catalogByCode.get(language.languageCode);
              const label = languageLabel(catalogItem, language.languageCode);
              return (
                <article className={styles.editorLanguage} key={language.languageCode}>
                  <div className={styles.editorLanguageHeading}>
                    <div>
                      <h3>{label}</h3>
                      <p>{secondaryLanguageLabel(catalogItem, language.languageCode)}</p>
                    </div>
                    <button className={styles.removeButton} type='button' onClick={() => setDraftValue({ languages: draft.languages.filter((_, itemIndex) => itemIndex !== index) })} aria-label={'Xóa ' + label}>
                      <Icon name='x' size={18} />
                    </button>
                  </div>
                  <div className={styles.roleChoices} role='group' aria-label={'Vai trò của ' + label}>
                    {(['native', 'known', 'learning'] as LanguageRole[]).map((role) => (
                      <label className={styles.checkboxLabel} key={role}>
                        <input type='checkbox' checked={language.roles.includes(role)} onChange={() => toggleRole(index, role)} />
                        {ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                  <div className={styles.editorControls}>
                    <label className={styles.fieldLabel}>
                      Mức tự đánh giá
                      <select value={language.declaredProficiency} onChange={(event) => {
                        const value = event.target.value;
                        if (isDeclaredProficiency(value)) updateLanguage(index, { declaredProficiency: value });
                      }}>
                        {PROFICIENCY_VALUES.filter((value) => value !== 'NATIVE' || language.roles.includes('native')).map((value) => <option key={value} value={value}>{PROFICIENCY_LABELS[value]}</option>)}
                      </select>
                    </label>
                    <label className={styles.fieldLabel}>
                      Hiển thị trên hồ sơ
                      <select value={language.visibility ?? 'PUBLIC'} onChange={(event) => updateLanguage(index, { visibility: event.target.value as 'PUBLIC' | 'PRIVATE' })}>
                        <option value='PUBLIC'>Công khai</option>
                        <option value='PRIVATE'>Riêng tư</option>
                      </select>
                    </label>
                  </div>
                  {language.roles.includes('learning') ? (
                    <label className={styles.checkboxLabel}>
                      <input type='checkbox' checked={Boolean(language.isPrimaryLearningTarget)} onChange={(event) => setPrimary(index, event.target.checked)} />
                      Đây là mục tiêu học chính
                    </label>
                  ) : null}
                </article>
              );
            })}
          </div>
          {availableLanguages.length > 0 ? (
            <label className={styles.fieldLabel}>
              Thêm một ngôn ngữ
              <select value='' onChange={(event) => addLanguage(event.target.value)}>
                <option value=''>Chọn từ danh sách</option>
                {availableLanguages.map((language) => <option key={language.code} value={language.code}>{language.nativeName} · {language.englishName}</option>)}
              </select>
            </label>
          ) : null}
        </fieldset>

        <fieldset className={styles.editorFieldset}>
          <legend>Mục tiêu và kỹ năng</legend>
          <div className={styles.editorChoiceGrid}>
            <div>
              <h3>Mục tiêu học</h3>
              <div className={styles.choiceList}>
                {goalValues.map((goal) => (
                  <label className={styles.checkboxLabel} key={goal}>
                    <input type='checkbox' checked={draft.goals.includes(goal)} onChange={() => setDraftValue({ goals: draft.goals.includes(goal) ? draft.goals.filter((item) => item !== goal) : [...draft.goals, goal] })} />
                    {goalLabel(goal)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3>Kỹ năng ưu tiên</h3>
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
          <legend>Sở thích và nhịp học</legend>
          <label className={styles.fieldLabel}>
            Sở thích
            <div className={styles.inlineField}>
              <input value={interestValue} onChange={(event) => setInterestValue(event.target.value)} onKeyDown={handleInterestKeyDown} placeholder='Ví dụ: âm nhạc' />
              <Button variant='quiet' size='sm' type='button' onClick={addInterest}>Thêm</Button>
            </div>
          </label>
          {draft.interests.length > 0 ? <div className={styles.editorChips}>{draft.interests.map((interest) => <Chip key={interest} onRemove={() => setDraftValue({ interests: draft.interests.filter((item) => item !== interest) })}>{interest}</Chip>)}</div> : null}
          <div className={styles.editorControls}>
            <label className={styles.fieldLabel}>
              Múi giờ
              <select value={draft.timezone ?? ''} onChange={(event) => setDraftValue({ timezone: event.target.value || null })}>
                <option value=''>Chưa chọn</option>
                {draft.timezone && !TIMEZONES.some((timezone) => timezone.value === draft.timezone) ? <option value={draft.timezone}>{draft.timezone}</option> : null}
                {TIMEZONES.map((timezone) => <option key={timezone.value} value={timezone.value}>{timezone.label}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.availabilityEditor}>
            <h3>Khung giờ có thể kết nối</h3>
            {draft.availability.length > 0 ? (
              <ul className={styles.availabilityEditList}>
                {draft.availability.map((window, index) => (
                  <li key={window.dayOfWeek + '-' + index}>
                    <span>{formatAvailabilityWindow(window)}</span>
                    <button className={styles.removeButton} type='button' onClick={() => setDraftValue({ availability: draft.availability.filter((_, itemIndex) => itemIndex !== index) })} aria-label={'Xóa khung giờ ' + (index + 1)}><Icon name='x' size={16} /></button>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.mutedText}>Chưa thêm khung giờ.</p>}
            <div className={styles.availabilityAddRow}>
              <label className={styles.fieldLabel}>Ngày<select value={newDay} onChange={(event) => setNewDay(Number(event.target.value))}>{Object.entries(DAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className={styles.fieldLabel}>Bắt đầu<input type='time' value={newStart} onChange={(event) => setNewStart(event.target.value)} /></label>
              <label className={styles.fieldLabel}>Kết thúc<input type='text' inputMode='numeric' pattern='^([01][0-9]|2[0-3]):[0-5][0-9]|24:00$' value={newEnd} onChange={(event) => setNewEnd(event.target.value)} /></label>
              <Button variant='quiet' size='sm' type='button' onClick={addAvailability}>Thêm giờ</Button>
            </div>
          </div>
        </fieldset>

        {formError ? <p className={styles.formError} role='alert'>{formError}</p> : null}
        {saveError ? <p className={styles.formError} role='alert'>{saveError}</p> : null}
        <div className={styles.editorActions}>
          <Button variant='quiet' type='button' onClick={onCancel}>Hủy</Button>
          <Button variant='primary' type='submit' loading={saving}>Lưu thay đổi</Button>
        </div>
      </form>
    </section>
  );
}

function PassportLoading({ label }: { label: string }) {
  return (
    <PassportStateFrame>
      <div className={styles.loadingState} aria-busy='true' aria-label={label}>
        <span /><span /><span /><span />
      </div>
    </PassportStateFrame>
  );
}

function PassportStateFrame({ children }: { children: ReactNode }) {
  return <section className={styles.stateFrame} aria-labelledby='passport-state-title'><h1 className={styles.screenReaderOnly} id='passport-state-title'>Hộ chiếu ngôn ngữ</h1>{children}</section>;
}

function timeToMinutes(value: string): number {
  if (value === '24:00') return 1440;
  const [hour, minute] = value.split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}
