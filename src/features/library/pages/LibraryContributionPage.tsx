import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useAuth, type AuthStatus } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { LibraryContributionLicenseStep } from '../components/LibraryContributionLicenseStep';
import { LibraryContributionReview } from '../components/LibraryContributionReview';
import { LibraryContributionStepper } from '../components/LibraryContributionStepper';
import { LibraryContributionSuccess } from '../components/LibraryContributionSuccess';
import { LibraryContributionTypeFields } from '../components/LibraryContributionTypeFields';
import { LibraryContributionApi, libraryContributionApi } from '../library.contribution.api';
import { isPermanentLicensePolicyError } from '../library.contribution.errors';
import {
  INITIAL_CONTRIBUTION_FORM,
  type LibraryContributionApiPort,
  type LibraryContributionFormState,
  type LibraryContributionLanguageApiPort,
  type LibraryContributionPolicyApiPort,
} from '../library.contribution.types';
import { getApprovedContributionTypes, validateContributionForm, validateContributionStep } from '../library.contribution.validation';
import { isContributionStageBusy, isContributionRetryable, isTermsStaleError, useLibraryContribution } from '../hooks/useLibraryContribution';
import { useLibraryContributionPolicy } from '../hooks/useLibraryContributionPolicy';
import styles from './LibraryContributionPage.module.css';

interface LibraryContributionPageProps {
  api?: LibraryContributionApiPort;
  catalogApi?: LibraryContributionLanguageApiPort;
}

interface LibraryContributionPageViewProps extends LibraryContributionPageProps {
  authStatus: AuthStatus;
  policyApi?: LibraryContributionPolicyApiPort;
}

export function LibraryContributionPage() {
  const { api, status } = useAuth();
  const contributionApi = useMemo(() => new LibraryContributionApi(api), [api]);
  const catalogApi = useMemo(() => ({ listLanguages: () => api.getLanguages() }), [api]);
  return <LibraryContributionPageView api={contributionApi} catalogApi={catalogApi} authStatus={status} />;
}

export function LibraryContributionPageView({
  api = libraryContributionApi,
  catalogApi = languageApi,
  authStatus,
  policyApi = api,
}: LibraryContributionPageViewProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<LibraryContributionFormState>(INITIAL_CONTRIBUTION_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [languagesError, setLanguagesError] = useState<unknown>(null);
  const [policyNotice, setPolicyNotice] = useState<string | null>(null);
  const [termsReviewRequired, setTermsReviewRequired] = useState(false);
  const successRef = useRef<HTMLElement>(null);
  const policy = useLibraryContributionPolicy(policyApi, authStatus === 'authenticated');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      navigate('/login', { replace: true, state: { from: '/library/contribute' } });
    }
  }, [authStatus, navigate]);

  const loadLanguages = useCallback(async () => {
    if (authStatus !== 'authenticated') return;
    setLanguagesLoading(true);
    setLanguagesError(null);
    try {
      setLanguages(await catalogApi.listLanguages());
    } catch (cause) {
      setLanguages([]);
      setLanguagesError(cause);
    } finally {
      setLanguagesLoading(false);
    }
  }, [authStatus, catalogApi]);

  useEffect(() => { void loadLanguages(); }, [loadLanguages]);

  const refreshPolicyForSubmission = useCallback((error: unknown) => {
    const termsAreStale = isTermsStaleError(error);
    const licensePolicyChanged = isPermanentLicensePolicyError(error);
    setForm((current) => ({
      ...current,
      rightsConfirmed: false,
      reuseConsent: false,
      licenseKey: termsAreStale ? current.licenseKey : '',
    }));
    setFieldErrors({});
    setTermsReviewRequired(termsAreStale);
    if (termsAreStale) setStep(3);
    setPolicyNotice(termsAreStale
      ? 'Chính sách đóng góp đã thay đổi. Hãy xem lại điều khoản và xác nhận mới trước khi gửi lại.'
      : licensePolicyChanged
        ? 'Giấy phép đã chọn không còn phù hợp. Bản nháp đã tạo được giữ nguyên và không thể âm thầm thay thế giấy phép trong luồng này; hệ thống sẽ không tự tạo bản nháp thứ hai.'
        : 'Giấy phép đã chọn không còn phù hợp. Hãy kiểm tra chính sách trước khi thử lại.');
    void policy.reload();
  }, [policy.reload]);
  const contribution = useLibraryContribution({ api, onPolicyRefreshRequired: refreshPolicyForSubmission });
  const remoteAttemptStarted = Boolean(contribution.state.frozenSnapshot) || contribution.state.isBusy;
  const approvedTypes = policy.policy ? getApprovedContributionTypes(policy.policy) : [];
  const selectedLicense = policy.policy?.licenses.find((license) => license.licenseKey === form.licenseKey);

  useEffect(() => {
    if (contribution.state.stage === 'SUCCESS') {
      setTermsReviewRequired(false);
      window.setTimeout(() => successRef.current?.focus(), 0);
    }
  }, [contribution.state.stage]);

  const updateForm = (patch: Partial<LibraryContributionFormState>) => {
    const consentOnlyPatch = Object.keys(patch).every((key) => key === 'rightsConfirmed' || key === 'reuseConsent');
    if (remoteAttemptStarted && !(termsReviewRequired && consentOnlyPatch)) return;
    setForm((current) => ({ ...current, ...patch }));
    if (Object.keys(fieldErrors).some((key) => Object.prototype.hasOwnProperty.call(patch, key))) {
      setFieldErrors({});
    }
  };

  const focusFirstError = (errors: Record<string, string>) => {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    window.setTimeout(() => document.getElementById(fieldIdForError(firstField))?.focus(), 0);
  };

  const goToStep = (nextStep: number) => {
    if (!policy.policy || remoteAttemptStarted || nextStep > step) return;
    setStep(Math.max(0, Math.min(3, nextStep)));
    setFieldErrors({});
  };

  const handleNext = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!policy.policy) return;
    const errors = validateContributionStep(form, policy.policy, languages, step);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const handleSubmit = () => {
    if (!policy.policy) return;
    const result = validateContributionForm(form, policy.policy, languages);
    setFieldErrors(result.errors);
    if (!result.snapshot) {
      focusFirstError(result.errors);
      return;
    }
    void (termsReviewRequired
      ? contribution.retrySubmitWithSnapshot(result.snapshot)
      : contribution.submit(result.snapshot));
  };

  const startOver = () => {
    contribution.reset();
    setForm(INITIAL_CONTRIBUTION_FORM);
    setFieldErrors({});
    setPolicyNotice(null);
    setTermsReviewRequired(false);
    setStep(0);
  };

  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return <LoadingSurface label='Đang kiểm tra phiên đăng nhập' />;
  }

  if (contribution.state.stage === 'SUCCESS') {
    return (
      <div className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
          <Link to='/library'>Thư viện mở</Link><span aria-hidden='true'>/</span><span aria-current='page'>Đóng góp tài nguyên</span>
        </nav>
        <LibraryContributionSuccess ref={successRef} onContributeAnother={startOver} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link><span aria-hidden='true'>/</span><Link to='/library'>Thư viện mở</Link><span aria-hidden='true'>/</span><span aria-current='page'>Đóng góp tài nguyên</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>COMMUNITY CONTRIBUTION · PHASE 08</p>
          <h1>Thêm một mảnh ghép hữu ích cho người học.</h1>
          <p className={styles.heroDescription}>Chia sẻ từ, câu và bản dịch bạn có quyền đóng góp. Nội dung sẽ được xem xét trước khi xuất hiện trong thư viện công khai.</p>
        </div>
        <aside className={styles.heroNote} aria-label='Nguyên tắc đóng góp'>
          <Icon name='lock' size={20} aria-hidden='true' />
          <div><strong>Rõ nguồn. Rõ quyền.</strong><p>Bạn sẽ chọn giấy phép và cách ghi công trước khi gửi.</p></div>
        </aside>
      </header>

      {policy.isLoading || languagesLoading ? <section className={styles.loadingPanel}><Skeleton lines={6} label='Đang chuẩn bị biểu mẫu đóng góp' /></section> : null}
      {!policy.isLoading && policy.error ? <ErrorState title='Chưa thể tải chính sách đóng góp' description='Hệ thống chưa tải được loại tài nguyên và giấy phép phù hợp. Bạn hãy thử lại.' onRetry={() => void policy.reload()} retrying={policy.isLoading} /> : null}
      {!policy.isLoading && !policy.error && languagesError ? <ErrorState title='Chưa thể tải danh mục ngôn ngữ' description='Danh mục ngôn ngữ đang tạm thời chưa sẵn sàng. Bạn hãy thử lại.' onRetry={() => void loadLanguages()} retrying={languagesLoading} /> : null}
      {!policy.isLoading && !policy.error && !languagesError && policy.policy && policy.policy.licenses.length === 0 ? (
        <NoEligibleLicenseState onRetry={() => void policy.reload()} retrying={policy.isLoading} />
      ) : null}
      {!policy.isLoading && !policy.error && !languagesError && policy.policy && policy.policy.licenses.length > 0 && approvedTypes.length === 0 ? (
        <NoContributionTypeState />
      ) : null}

      {!policy.isLoading && !policy.error && !languagesError && policy.policy && policy.policy.licenses.length > 0 && approvedTypes.length > 0 ? (
        <>
          <div className={styles.formIntro}>
            <div><p className={styles.eyebrow}>BỐN BƯỚC NGẮN</p><h2>Chuẩn bị đóng góp</h2></div>
            <p>Chỉ những tài nguyên công khai, có nguồn gốc và giấy phép phù hợp mới được gửi vào hàng chờ xem xét.</p>
          </div>
          <LibraryContributionStepper activeStep={step} onStepChange={goToStep} disabled={remoteAttemptStarted} />

          {policyNotice ? <div className={styles.policyNotice} role='alert'><Icon name='info' size={18} /><span>{policyNotice}</span></div> : null}
          {contribution.state.errorMessage ? (
            <div className={styles.remoteError} role='alert'>
              <div><strong>Chưa thể hoàn tất bước này</strong><p>{contribution.state.errorMessage}</p></div>
              {isContributionRetryable(contribution.state.stage) && !isPermanentLicensePolicyError(contribution.state.error)
                ? <Button variant='secondary' onClick={() => void contribution.retry()} loading={contribution.state.isBusy}>Thử lại</Button>
                : null}
              {isPermanentLicensePolicyError(contribution.state.error)
                ? <Button variant='secondary' onClick={startOver}>Bắt đầu đóng góp mới</Button>
                : null}
            </div>
          ) : null}
          {isContributionStageBusy(contribution.state.stage) ? <p className={styles.liveStatus} role='status' aria-live='polite'>{stageMessage(contribution.state.stage)}</p> : null}

          <form className={styles.formCard} onSubmit={handleNext} noValidate>
            {step === 0 ? <LibraryContributionTypeFields mode='type' form={form} approvedTypes={approvedTypes} languages={languages} errors={fieldErrors} disabled={remoteAttemptStarted} onChange={updateForm} /> : null}
            {step === 1 ? <LibraryContributionTypeFields mode='content' form={form} approvedTypes={approvedTypes} languages={languages} errors={fieldErrors} disabled={remoteAttemptStarted} onChange={updateForm} /> : null}
            {step === 2 ? <LibraryContributionLicenseStep form={form} licenses={policy.policy.licenses} errors={fieldErrors} disabled={remoteAttemptStarted} onChange={updateForm} /> : null}
            {step === 3 ? <LibraryContributionReview form={form} languages={languages} license={selectedLicense} errors={fieldErrors} disabled={remoteAttemptStarted && !termsReviewRequired} loading={contribution.state.isBusy} onChange={updateForm} onSubmit={handleSubmit} /> : null}

            {step < 3 ? (
              <div className={styles.formActions}>
                {step > 0 ? <Button type='button' variant='quiet' disabled={remoteAttemptStarted} onClick={() => goToStep(step - 1)}>Quay lại</Button> : <span />}
                <Button type='submit' size='lg' disabled={remoteAttemptStarted}>Tiếp tục</Button>
              </div>
            ) : (
              <div className={styles.formActions}><Button type='button' variant='quiet' disabled={remoteAttemptStarted} onClick={() => goToStep(2)}>Quay lại</Button></div>
            )}
          </form>
        </>
      ) : null}
    </div>
  );
}

function LoadingSurface({ label }: { label: string }) {
  return <div className={styles.loadingPanel} role='status' aria-label={label}><Skeleton lines={5} label={label} /></div>;
}

function NoEligibleLicenseState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <section className={styles.blockedState} role='status' aria-labelledby='no-license-heading'>
      <div className={styles.blockedIcon} aria-hidden='true'><Icon name='lock' size={24} /></div>
      <p className={styles.eyebrow}>TẠM THỜI CHƯA THỂ GỬI</p>
      <h2 id='no-license-heading'>Hiện chưa có giấy phép phù hợp để nhận đóng góp.</h2>
      <p>Biểu mẫu được khóa để bảo vệ quyền tái sử dụng. Khi chính sách có giấy phép phù hợp, bạn có thể quay lại đây để tiếp tục.</p>
      <Button variant='secondary' onClick={onRetry} loading={retrying}>Tải lại chính sách</Button>
    </section>
  );
}

function NoContributionTypeState() {
  return (
    <section className={styles.blockedState} role='status' aria-labelledby='no-type-heading'>
      <div className={styles.blockedIcon} aria-hidden='true'><Icon name='info' size={24} /></div>
      <p className={styles.eyebrow}>CHƯA CÓ LOẠI ĐƯỢC DUYỆT</p>
      <h2 id='no-type-heading'>Hiện chưa có loại tài nguyên phù hợp để đóng góp.</h2>
      <p>Chúng tôi chỉ mở những loại đã được Backend phê duyệt rõ ràng.</p>
    </section>
  );
}

function stageMessage(stage: string): string {
  if (stage === 'CREATING_RESOURCE') return 'Đang tạo bản nháp công khai…';
  if (stage === 'ATTACHING_PROVENANCE') return 'Đang gắn nguồn gốc và giấy phép…';
  if (stage === 'SUBMITTING') return 'Đang gửi vào hàng chờ xem xét…';
  return '';
}

function fieldIdForError(field: string): string {
  const ids: Record<string, string> = {
    resourceType: 'contribution-resource-type-vocabulary',
    primaryLanguageCode: 'contribution-primary-language',
    secondaryLanguageCode: 'contribution-secondary-language',
    cefrLevel: 'contribution-cefr',
    topics: 'contribution-topics',
    term: 'contribution-term',
    definition: 'contribution-definition',
    partOfSpeech: 'contribution-part-of-speech',
    exampleSentence: 'contribution-example-sentence',
    text: 'contribution-sentence-text',
    context: 'contribution-sentence-context',
    sourceText: 'contribution-source-text',
    translatedText: 'contribution-translated-text',
    attribution: 'contribution-attribution',
    licenseKey: 'contribution-license-0',
    rightsConfirmed: 'contribution-rights-confirmed',
    reuseConsent: 'contribution-reuse-consent',
  };
  return ids[field] ?? field;
}
