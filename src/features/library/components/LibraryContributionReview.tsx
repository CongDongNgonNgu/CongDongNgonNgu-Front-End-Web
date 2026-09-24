import { Button } from '../../../components/ui/Button';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import type { LibraryContributionFormState, LibraryContributionPolicyLicense } from '../library.contribution.types';
import styles from './LibraryContributionReview.module.css';

interface LibraryContributionReviewProps {
  form: LibraryContributionFormState;
  languages: LanguageCatalogItem[];
  license: LibraryContributionPolicyLicense | undefined;
  errors: Record<string, string>;
  disabled?: boolean;
  loading?: boolean;
  onChange: (patch: Partial<LibraryContributionFormState>) => void;
  onSubmit: () => void;
}

export function LibraryContributionReview({ form, languages, license, errors, disabled = false, loading = false, onChange, onSubmit }: LibraryContributionReviewProps) {
  const languageName = (code: string) => languages.find((language) => language.code.toLowerCase() === code.toLowerCase())?.vietnameseName
    ?? languages.find((language) => language.code.toLowerCase() === code.toLowerCase())?.englishName
    ?? code;
  const contentSummary = form.details.resourceType === 'VOCABULARY'
    ? form.details.term
    : form.details.resourceType === 'SENTENCE'
      ? form.details.text
      : `${form.details.sourceText} → ${form.details.translatedText}`;

  return (
    <section className={styles.section} aria-labelledby='contribution-review-heading'>
      <div className={styles.heading}>
        <p className={styles.kicker}>BƯỚC 4</p>
        <h2 id='contribution-review-heading'>Xác nhận trước khi gửi</h2>
        <p>Kiểm tra lại nội dung và xác nhận quyền sử dụng. Đóng góp sẽ được gửi để xem xét, không được xác minh ngay lập tức.</p>
      </div>

      <dl className={styles.summary}>
        <div><dt>Loại</dt><dd>{form.resourceType}</dd></div>
        <div><dt>Ngôn ngữ</dt><dd>{languageName(form.primaryLanguageCode)}{form.secondaryLanguageCode ? ` → ${languageName(form.secondaryLanguageCode)}` : ''}</dd></div>
        <div><dt>Nội dung</dt><dd>{contentSummary}</dd></div>
        <div><dt>Ghi công</dt><dd>{form.attribution}</dd></div>
        <div><dt>Giấy phép</dt><dd>{license?.displayName ?? 'Chưa chọn'}</dd></div>
      </dl>

      <div className={styles.consentPanel}>
        <p className={styles.consentIntro}>Hai xác nhận này là bắt buộc và luôn bắt đầu ở trạng thái chưa chọn.</p>
        <label className={styles.consentOption}>
          <input
            id='contribution-rights-confirmed'
            type='checkbox'
            checked={form.rightsConfirmed}
            disabled={disabled}
            aria-invalid={Boolean(errors.rightsConfirmed)}
            aria-describedby={errors.rightsConfirmed ? 'contribution-rights-confirmed-error' : undefined}
            onChange={(event) => onChange({ rightsConfirmed: event.target.checked })}
          />
          <span>Tôi xác nhận tôi đã tạo nội dung này hoặc có quyền đóng góp nội dung theo giấy phép đã chọn.</span>
        </label>
        {errors.rightsConfirmed ? <p id='contribution-rights-confirmed-error' className={styles.error} role='alert'>{errors.rightsConfirmed}</p> : null}
        <label className={styles.consentOption}>
          <input
            id='contribution-reuse-consent'
            type='checkbox'
            checked={form.reuseConsent}
            disabled={disabled}
            aria-invalid={Boolean(errors.reuseConsent)}
            aria-describedby={errors.reuseConsent ? 'contribution-reuse-consent-error' : undefined}
            onChange={(event) => onChange({ reuseConsent: event.target.checked })}
          />
          <span>Tôi hiểu rằng nếu được xác minh, đóng góp này có thể được tái phân phối công khai theo giấy phép đã chọn.</span>
        </label>
        {errors.reuseConsent ? <p id='contribution-reuse-consent-error' className={styles.error} role='alert'>{errors.reuseConsent}</p> : null}
      </div>

      <div className={styles.submitPanel}>
        <strong>Gửi để xem xét cộng đồng</strong>
        <p>Đóng góp sẽ được gửi để xem xét, không được xác minh ngay lập tức. Nội dung chỉ xuất hiện trong thư viện công khai sau khi được xác minh và vượt qua các điều kiện công khai.</p>
        <Button type='button' size='lg' loading={loading} disabled={disabled} onClick={onSubmit}>Gửi đóng góp</Button>
      </div>
    </section>
  );
}
