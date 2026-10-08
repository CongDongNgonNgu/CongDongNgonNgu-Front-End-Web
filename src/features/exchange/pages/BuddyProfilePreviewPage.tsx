import { proficiencyLabel } from '../../passport/passport.utils';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { languageDisplayName } from '../../ui-locale/language-display';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { SelectControl, Textarea } from '../../../components/ui/FormControls';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Dialog, DropdownMenu } from '../../../components/ui/Overlays';
import { Avatar, Badge } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import { ExchangeApi } from '../exchange-api';
import type {
  BuddyProfilePreview,
  BuddyProfilePreviewApi,
  ExchangeBlockStatus,
  ExchangeReportCategory,
  ExchangeRelationshipResponse,
  RelationshipState,
} from '../exchange.types';
import { EXCHANGE_REPORT_CATEGORIES } from '../exchange.types';
import { goalDisplay, relationshipStateKeys, relationshipDescriptionKeys, reportCategoryKeys } from '../exchange-copy';
import styles from './BuddyProfilePreviewPage.module.css';

type RelationshipAction = 'request' | 'accept' | 'decline' | 'cancel' | 'disconnect';
type SafetyDialog = 'block' | 'unblock' | 'report' | null;

interface BuddyProfilePreviewPageViewProps {
  api: BuddyProfilePreviewApi;
  authenticated: boolean;
  authLoading?: boolean;
  userId?: string;
}

export function BuddyProfilePreviewPage() {
  const auth = useAuth();
  const api = useMemo(() => new ExchangeApi(auth.api), [auth.api]);
  return (
    <BuddyProfilePreviewPageView
      api={api}
      authenticated={auth.status === 'authenticated'}
      authLoading={auth.status === 'loading'}
    />
  );
}

export function BuddyProfilePreviewPageView({
  api,
  authenticated,
  authLoading = false,
  userId: providedUserId,
}: BuddyProfilePreviewPageViewProps) {
  const { t, locale } = useUiLocale();
  const params = useParams<{ userId?: string }>();
  const location = useLocation();
  const userId = providedUserId ?? params.userId ?? '';
  const [profile, setProfile] = useState<BuddyProfilePreview | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'blocked'>('loading');
  const [blockStatus, setBlockStatus] = useState<ExchangeBlockStatus | null>(null);
  const [activeAction, setActiveAction] = useState<RelationshipAction | null>(null);
  const [actionError, setActionError] = useState<TranslationKey | ''>('');
  const [actionMessage, setActionMessage] = useState<TranslationKey | ''>('');
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [safetyDialog, setSafetyDialog] = useState<SafetyDialog>(null);
  const [activeSafetyAction, setActiveSafetyAction] = useState<'block' | 'unblock' | null>(null);
  const [safetyError, setSafetyError] = useState<TranslationKey | ''>('');
  const [safetyMessage, setSafetyMessage] = useState<TranslationKey | ''>('');
  const [retryKey, setRetryKey] = useState(0);

  const retryLoad = useCallback(() => setRetryKey((value) => value + 1), []);

  useEffect(() => {
    if (!userId || !authenticated) return;
    let active = true;
    setLoadState('loading');
    setProfile(null);
    setSafetyError('');
    api.getBlockStatus(userId)
      .then((nextBlockStatus) => {
        if (!active) return;
        setBlockStatus(nextBlockStatus);
        if (nextBlockStatus.blockedByMe) {
          setLoadState('blocked');
          return null;
        }
        return api.getBuddyProfile(userId);
      })
      .then((nextProfile) => {
        if (!active || !nextProfile) return;
        setProfile(nextProfile);
        setLoadState('ready');
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
        setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [api, authenticated, retryKey, userId]);

  const openSafetyDialog = useCallback((dialog: Exclude<SafetyDialog, null>) => {
    setSafetyMenuOpen(false);
    setSafetyError('');
    setSafetyDialog(dialog);
  }, []);

  const handleSafetyAction = useCallback(async (action: 'block' | 'unblock') => {
    if (activeSafetyAction || !userId) return;
    setActiveSafetyAction(action);
    setSafetyError('');
    try {
      if (action === 'block') {
        await api.blockUser(userId);
        setBlockStatus({ scope: 'exchange-block-status', targetUserId: userId, blockedByMe: true });
        setProfile(null);
        setLoadState('blocked');
        setSafetyMessage('exchange.blockedMessage');
      } else {
        await api.unblockUser(userId);
        setBlockStatus({ scope: 'exchange-block-status', targetUserId: userId, blockedByMe: false });
        setSafetyMessage('exchange.unblockedMessage');
        setRetryKey((value) => value + 1);
      }
      setSafetyDialog(null);
    } catch {
      setSafetyError('exchange.actionError');
    } finally {
      setActiveSafetyAction(null);
    }
  }, [activeSafetyAction, api, userId]);

  const handleAction = useCallback(async (action: RelationshipAction) => {
    if (!profile || activeAction || !userId) return;
    setActiveAction(action);
    setActionError('');
    setActionMessage('');
    try {
      const relationship = await runRelationshipAction(api, action, userId);
      setProfile((current) => current ? { ...current, relationship } : current);
      setActionMessage(`exchange.success.${action}`);
    } catch {
      setActionError('exchange.actionError');
    } finally {
      setActiveAction(null);
    }
  }, [activeAction, api, profile, userId]);

  if (authLoading && !providedUserId) {
    return <PreviewLoading />;
  }
  if (!authenticated && !providedUserId) {
    return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  }
  if (!userId) {
    return <Navigate to='/exchange' replace />;
  }
  if (loadState === 'blocked') {
    return (
      <>
        <BlockedPreviewState
          blockedByMe={Boolean(blockStatus?.blockedByMe)}
          message={safetyMessage ? t(safetyMessage) : ''}
          onUnblock={() => openSafetyDialog('unblock')}
          isUnblocking={activeSafetyAction === 'unblock'}
        />
        <SafetyConfirmDialog
          open={safetyDialog === 'unblock'}
          title={t('exchange.unblockTitle')}
          description={t('exchange.unblockDescription')}
          confirmLabel={t('exchange.unblock')}
          active={activeSafetyAction === 'unblock'}
          error={safetyError ? t(safetyError) : ''}
          onClose={() => setSafetyDialog(null)}
          onConfirm={() => handleSafetyAction('unblock')}
        />
      </>
    );
  }
  if (loadState === 'error') {
    return (
      <div className={styles.page}>
        <ErrorState
          title={t('exchange.profileErrorTitle')}
          description={t('exchange.profileErrorDescription')}
          onRetry={retryLoad}
          retryLabel={t('exchange.profileRetry')}
        />
      </div>
    );
  }
  if (loadState === 'loading' || !profile) {
    return <PreviewLoading />;
  }

  return (
    <>
      <div className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label={t('exchange.breadcrumb')}>
          <Link to='/exchange'>{t('exchange.browse')}</Link>
          <span aria-hidden='true'>/</span>
          <span aria-current='page'>{t('exchange.profileBreadcrumb')}</span>
        </nav>

        <section className={styles.hero} aria-labelledby='buddy-preview-heading'>
          <div className={styles.identityBlock}>
            <Avatar name={profile.user.displayName} size='lg' />
            <div>
              <p className={styles.eyebrow}>{t('exchange.profileEyebrow')}</p>
              <h1 id='buddy-preview-heading'>{profile.user.displayName}</h1>
              <p className={styles.heroDescription}>{t('exchange.profileIntro')}</p>
            </div>
          </div>
          <div className={styles.heroActions}>
            <Badge tone={relationshipTone(profile.relationship.state)}>{t(relationshipStateKeys[profile.relationship.state])}</Badge>
            <SafetyMenu open={safetyMenuOpen} onToggle={() => setSafetyMenuOpen((open) => !open)} onAction={openSafetyDialog} />
          </div>
        </section>

      <aside className={styles.privacyNote} aria-label={t('exchange.visibilityLabel')}>
        <strong>{t('exchange.safeInfoTitle')}</strong>
        <span>{t('exchange.safeInfoDescription')}</span>
      </aside>

        <div className={styles.contentGrid}>
          <div className={styles.profileColumn}>
          <section className={styles.panel} aria-labelledby='languages-heading'>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{t('exchange.passportEyebrow')}</p>
              <h2 id='languages-heading'>{t('exchange.languagesTitle')}</h2>
            </div>
            <div className={styles.languageGrid}>
              <LanguageGroup title={t('exchange.offered')} languages={profile.languages.filter((language) => language.offered)} />
              <LanguageGroup title={t('exchange.wanted')} languages={profile.languages.filter((language) => language.wanted)} />
            </div>
          </section>

          <section className={styles.panel} aria-labelledby='topics-heading'>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{t('exchange.contextEyebrow')}</p>
              <h2 id='topics-heading'>{t('exchange.topicsTitle')}</h2>
            </div>
            <div className={styles.topicColumns}>
              <TopicGroup title={t('exchange.goals')} values={profile.goals.map((value) => goalDisplay(value, locale))} empty={t('exchange.noGoals')} />
              <TopicGroup title={t('exchange.interests')} values={profile.interests} empty={t('exchange.noInterests')} />
            </div>
          </section>

          <section className={styles.panel} aria-labelledby='availability-heading'>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{t('exchange.signalsEyebrow')}</p>
              <h2 id='availability-heading'>{t('exchange.summaryTitle')}</h2>
            </div>
            <dl className={styles.summaryList}>
              <div>
                <dt>{t('exchange.timezone')}</dt>
                <dd>{profile.timezoneSummary?.hasTimezone ? t('exchange.timezoneShared') : t('exchange.notShared')}</dd>
              </div>
              <div>
                <dt>{t('exchange.availability')}</dt>
                <dd>{profile.availabilitySummary?.hasAvailability ? t('exchange.availabilityShared') : t('exchange.notShared')}</dd>
              </div>
            </dl>
          </section>
        </div>

          <aside className={`${styles.panel} ${styles.relationshipPanel}`} aria-labelledby='relationship-heading'>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{t('exchange.relationshipEyebrow')}</p>
            <h2 id='relationship-heading'>{t('exchange.relationshipTitle')}</h2>
          </div>
          <div className={styles.statusBlock} role='status' aria-live='polite'>
            <Badge tone={relationshipTone(profile.relationship.state)}>{t(relationshipStateKeys[profile.relationship.state])}</Badge>
            <p>{t(relationshipDescriptionKeys[profile.relationship.state])}</p>
          </div>
          {activeAction ? <p className={styles.liveMessage} role='status' aria-live='polite'>{t('exchange.relationshipLoading')}</p> : null}
          {actionMessage ? <p className={styles.successMessage} role='status' aria-live='polite'>{t(actionMessage)}</p> : null}
          {actionError ? <p className={styles.errorMessage} role='alert'>{t(actionError)}</p> : null}
          <RelationshipActions
            relationship={profile.relationship}
            activeAction={activeAction}
            onAction={handleAction}
          />
          <p className={styles.relationshipNote}>{t('exchange.relationshipNote')}</p>
          </aside>
        </div>
        {safetyMessage ? <p className={styles.safetyMessage} role='status'>{t(safetyMessage)}</p> : null}
      </div>
      <SafetyConfirmDialog
        open={safetyDialog === 'block'}
        title={t('exchange.blockTitle')}
        description={t('exchange.blockDescription')}
        confirmLabel={t('exchange.block')}
        active={activeSafetyAction === 'block'}
        error={safetyError ? t(safetyError) : ''}
        onClose={() => setSafetyDialog(null)}
        onConfirm={() => handleSafetyAction('block')}
      />
      <ExchangeReportDialog
        open={safetyDialog === 'report'}
        api={api}
        targetUserId={userId}
        onClose={() => setSafetyDialog(null)}
        onSubmitted={() => {
          setSafetyDialog(null);
          setSafetyMessage('exchange.reportMessage');
        }}
      />
    </>
  );
}

function LanguageGroup({ title, languages }: { title: string; languages: BuddyProfilePreview['languages'] }) {
  const { t, locale } = useUiLocale();
  return (
    <div className={styles.languageGroup}>
      <h3>{title}</h3>
      {languages.length > 0 ? (
        <ul className={styles.languageList}>
          {languages.map((language) => (
            <li key={`${title}-${language.code}`} className={styles.languageItem}>
              <div>
                <strong>{language.nativeName}</strong>
                {languageDisplayName(language, locale) !== language.nativeName ? <span>{languageDisplayName(language, locale)}</span> : null}
              </div>
              <small>
                {proficiencyLabel(language.declaredProficiency, locale)}
                {language.assessedProficiency ? ` · ${t('exchange.assessed', { level: language.assessedProficiency })}` : ''}
              </small>
            </li>
          ))}
        </ul>
      ) : <p className={styles.mutedValue}>{t('exchange.notShared')}</p>}
    </div>
  );
}

function TopicGroup({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return (
    <div className={styles.topicGroup}>
      <h3>{title}</h3>
      {values.length > 0 ? <ul className={styles.topicList}>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className={styles.mutedValue}>{empty}</p>}
    </div>
  );
}

function RelationshipActions({
  relationship,
  activeAction,
  onAction,
}: {
  relationship: ExchangeRelationshipResponse;
  activeAction: RelationshipAction | null;
  onAction: (action: RelationshipAction) => void;
}) {
  const { t } = useUiLocale();
  const disabled = activeAction !== null;
  return (
    <div className={styles.actionGroup} aria-label={t('exchange.actionsLabel')}>
      {relationship.canRequest ? <Button fullWidth onClick={() => onAction('request')} loading={activeAction === 'request'} disabled={disabled}>{t('exchange.connect')}</Button> : null}
      {relationship.canAccept ? <Button fullWidth onClick={() => onAction('accept')} loading={activeAction === 'accept'} disabled={disabled}>{t('exchange.accept')}</Button> : null}
      {relationship.canDecline ? <Button fullWidth variant='quiet' onClick={() => onAction('decline')} loading={activeAction === 'decline'} disabled={disabled}>{t('exchange.decline')}</Button> : null}
      {relationship.canCancel ? <Button fullWidth variant='quiet' onClick={() => onAction('cancel')} loading={activeAction === 'cancel'} disabled={disabled}>{t('exchange.cancelRequest')}</Button> : null}
      {relationship.canDisconnect ? <Button fullWidth variant='danger' onClick={() => onAction('disconnect')} loading={activeAction === 'disconnect'} disabled={disabled}>{t('exchange.disconnect')}</Button> : null}
    </div>
  );
}

function SafetyMenu({
  open,
  onToggle,
  onAction,
}: {
  open: boolean;
  onToggle: () => void;
  onAction: (dialog: Exclude<SafetyDialog, null>) => void;
}) {
  const { t } = useUiLocale();
  return (
    <DropdownMenu open={open} label={t('exchange.safety')} onToggle={onToggle}>
      <button className={styles.safetyMenuItem} type='button' role='menuitem' onClick={() => onAction('report')}>
        <Icon name='flag' size={18} />
        <span>{t('exchange.report')}</span>
      </button>
      <button className={`${styles.safetyMenuItem} ${styles.safetyMenuItemDanger}`} type='button' role='menuitem' onClick={() => onAction('block')}>
        <Icon name='lock' size={18} />
        <span>{t('exchange.block')}</span>
      </button>
    </DropdownMenu>
  );
}

function BlockedPreviewState({
  blockedByMe,
  message,
  onUnblock,
  isUnblocking,
}: {
  blockedByMe: boolean;
  message: string;
  onUnblock: () => void;
  isUnblocking: boolean;
}) {
  const { t } = useUiLocale();
  return (
    <div className={styles.page}>
      <div className={styles.blockedPanel} role='status'>
        <span className={styles.blockedIcon} aria-hidden='true'><Icon name='lock' size={24} /></span>
        <p className={styles.eyebrow}>{t('exchange.safetyEyebrow')}</p>
        <h1>{t('exchange.unavailableTitle')}</h1>
        <p>
          {t('exchange.unavailableDescription')}</p>
        {message ? <p className={styles.safetyMessage}>{message}</p> : null}
        {blockedByMe ? <Button variant='secondary' onClick={onUnblock} loading={isUnblocking}>{t('exchange.unblock')}</Button> : null}
      </div>
    </div>
  );
}

function SafetyConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  active,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  active: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useUiLocale();
  return (
    <Dialog open={open} title={title} description={description} onClose={active ? () => undefined : onClose}>
      <div className={styles.safetyDialogBody}>
        <p className={styles.safetyDialogNote}>{t('exchange.safetyChoiceNote')}</p>
        {error ? <p className={styles.errorMessage} role='alert'>{error}</p> : null}
        <div className={styles.dialogActions}>
          <Button variant='quiet' onClick={onClose} disabled={active}>{t('exchange.cancel')}</Button>
          <Button variant='danger' onClick={onConfirm} loading={active}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function ExchangeReportDialog({
  open,
  api,
  targetUserId,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  api: BuddyProfilePreviewApi;
  targetUserId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { t, formatNumber } = useUiLocale();
  const [category, setCategory] = useState('');
  const [context, setContext] = useState('');
  const [validationError, setValidationError] = useState<TranslationKey | ''>('');
  const [submitError, setSubmitError] = useState<TranslationKey | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory('');
    setContext('');
    setValidationError('');
    setSubmitError('');
    setSubmitting(false);
    setSubmitted(false);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedContext = context.normalize('NFKC').trim();
    if (!category) {
      setValidationError('exchange.reportReasonRequired');
      return;
    }
    if (Array.from(normalizedContext).length > 1000) {
      setValidationError('exchange.reportContextLimit');
      return;
    }
    setValidationError('');
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.reportUser(targetUserId, {
        category: category as ExchangeReportCategory,
        ...(normalizedContext ? { context: normalizedContext } : {}),
      });
      setSubmitted(true);
    } catch {
      setSubmitError('exchange.actionError');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} title={t('exchange.report')} onClose={submitting ? () => undefined : onClose}>
      {submitted ? (
        <div className={styles.reportSubmitted} role='status'>
          <span className={styles.blockedIcon} aria-hidden='true'><Icon name='check' size={24} /></span>
          <h3>{t('exchange.reportReceived')}</h3>
          <p>{t('exchange.reportReceivedDescription')}</p>
          <Button onClick={onSubmitted}>{t('exchange.close')}</Button>
        </div>
      ) : (
        <form className={styles.reportForm} onSubmit={handleSubmit} noValidate>
          <p className={styles.safetyDialogNote}>{t('exchange.reportNote')}</p>
          <SelectControl
            label={t('exchange.reportReason')}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setValidationError('');
            }}
            required
          >
            <option value=''>{t('exchange.chooseReason')}</option>
            {EXCHANGE_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>{t(reportCategoryKeys[value])}</option>
            ))}
          </SelectControl>
          <Textarea
            label={t('exchange.reportContext')}
            value={context}
            onChange={(event) => {
              setContext(event.target.value);
              setValidationError('');
            }}
            hint={t('exchange.optional')}
            rows={5}
          />
          <p className={styles.charCount} aria-live='polite'>{t('exchange.characters', { count: formatNumber(Array.from(context).length), limit: formatNumber(1000) })}</p>
          {validationError ? <p className={styles.errorMessage} role='alert'>{t(validationError)}</p> : null}
          {submitError ? <p className={styles.errorMessage} role='alert'>{t(submitError)}</p> : null}
          <div className={styles.dialogActions}>
            <Button variant='quiet' type='button' onClick={onClose} disabled={submitting}>{t('exchange.cancel')}</Button>
            <Button type='submit' loading={submitting}>{t('exchange.submitReport')}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function PreviewLoading() {
  const { t } = useUiLocale();
  return <div className={styles.page}><div className={styles.loadingPanel}><Skeleton lines={7} label={t('exchange.profileLoading')} /></div></div>;
}

async function runRelationshipAction(api: BuddyProfilePreviewApi, action: RelationshipAction, userId: string) {
  switch (action) {
    case 'request': return api.requestConnection(userId);
    case 'accept': return api.acceptConnection(userId);
    case 'decline': return api.declineConnection(userId);
    case 'cancel': return api.cancelConnection(userId);
    case 'disconnect': return api.disconnect(userId);
  }
}

function relationshipTone(state: RelationshipState): 'neutral' | 'info' | 'success' | 'warning' {
  switch (state) {
    case 'CONNECTED': return 'success';
    case 'INCOMING_PENDING': return 'warning';
    case 'OUTGOING_PENDING': return 'info';
    default: return 'neutral';
  }
}
