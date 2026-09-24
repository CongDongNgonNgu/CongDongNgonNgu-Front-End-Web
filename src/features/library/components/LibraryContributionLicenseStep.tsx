import { Textarea } from '../../../components/ui/FormControls';
import type { LibraryContributionFormState, LibraryContributionPolicyLicense } from '../library.contribution.types';
import styles from './LibraryContributionLicenseStep.module.css';

interface LibraryContributionLicenseStepProps {
  form: LibraryContributionFormState;
  licenses: LibraryContributionPolicyLicense[];
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (patch: Partial<LibraryContributionFormState>) => void;
}

export function LibraryContributionLicenseStep({ form, licenses, errors, disabled = false, onChange }: LibraryContributionLicenseStepProps) {
  return (
    <section className={styles.section} aria-labelledby='contribution-source-heading'>
      <div className={styles.heading}>
        <p className={styles.kicker}>BƯỚC 3</p>
        <h2 id='contribution-source-heading'>Nguồn & giấy phép</h2>
        <p>Chọn giấy phép bạn hiểu rõ và cho phép người khác tái sử dụng theo đúng điều kiện đi kèm.</p>
      </div>

      <div className={styles.attributionPanel}>
        <Textarea
          id='contribution-attribution'
          label='Bạn muốn được ghi công như thế nào?'
          required
          maxLength={2_000}
          hint='Dòng này có thể xuất hiện công khai cùng tài nguyên nếu đóng góp được xác minh. Không dùng email hoặc thông tin tài khoản nếu bạn không chủ động muốn công khai.'
          value={form.attribution}
          error={errors.attribution}
          disabled={disabled}
          onChange={(event) => onChange({ attribution: event.target.value })}
        />
      </div>

      <fieldset className={styles.licenseFieldset} aria-describedby={errors.licenseKey ? 'contribution-license-error' : undefined}>
        <legend>Giấy phép đóng góp</legend>
        <p className={styles.hint}>Bạn cần chủ động chọn một giấy phép. Không có lựa chọn mặc định.</p>
        <div className={styles.licenseList}>
          {licenses.map((license, index) => (
            <label key={license.licenseKey} className={`${styles.licenseOption} ${form.licenseKey === license.licenseKey ? styles.licenseOptionSelected : ''}`}>
              <input
                id={`contribution-license-${index}`}
                type='radio'
                name='contributionLicense'
                value={license.licenseKey}
                checked={form.licenseKey === license.licenseKey}
                disabled={disabled}
                aria-invalid={Boolean(errors.licenseKey)}
                aria-describedby={errors.licenseKey ? 'contribution-license-error' : undefined}
                onChange={() => onChange({ licenseKey: license.licenseKey })}
              />
              <span className={styles.licenseBody}>
                <strong>{license.displayName}</strong>
                <span className={styles.licenseMeta}>{license.attributionRequired ? 'Yêu cầu ghi công' : 'Không bắt buộc ghi công'}</span>
                {license.derivativeConstraints ? <span className={styles.licenseConstraint}>{license.derivativeConstraints}</span> : null}
                <a href={license.canonicalUrl} target='_blank' rel='noopener noreferrer'>Xem điều kiện giấy phép <span aria-hidden='true'>↗</span></a>
              </span>
            </label>
          ))}
        </div>
        {errors.licenseKey ? <p id='contribution-license-error' className={styles.error} role='alert'>{errors.licenseKey}</p> : null}
      </fieldset>
    </section>
  );
}
