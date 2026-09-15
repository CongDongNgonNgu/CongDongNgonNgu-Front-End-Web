import { SelectControl, TextInput } from '../../../components/ui/FormControls';
import {
  COMMUNITY_CEFR_LEVELS,
  COMMUNITY_VISIBILITIES,
  type CommunityVisibility,
} from '../community.types';
import { countUnicodeCodePoints } from '../community-validation';
import styles from '../pages/CommunityRequestPage.module.css';

interface RequestMetadataFieldsProps {
  idPrefix: string;
  cefrLevel: string;
  topic: string;
  visibility: CommunityVisibility;
  errors: Partial<Record<'cefrLevel' | 'topic' | 'visibility', string>>;
  onChange: (field: 'cefrLevel' | 'topic' | 'visibility', value: string) => void;
}

export function RequestMetadataFields({
  idPrefix,
  cefrLevel,
  topic,
  visibility,
  errors,
  onChange,
}: RequestMetadataFieldsProps) {
  return (
    <section className={styles.metadataSection} aria-labelledby={idPrefix + '-metadata-heading'}>
      <div>
        <h2 id={idPrefix + '-metadata-heading'}>Thông tin thêm</h2>
        <p>Không bắt buộc, nhưng sẽ giúp cộng đồng trả lời sát với nhu cầu của bạn hơn.</p>
      </div>

      <div className={styles.metadataGrid}>
        <SelectControl
          id={idPrefix + '-cefr'}
          label='Trình độ CEFR'
          value={cefrLevel}
          onChange={(event) => onChange('cefrLevel', event.target.value)}
          error={errors.cefrLevel}
          hint='Không bắt buộc'
        >
          <option value=''>Chưa xác định</option>
          {COMMUNITY_CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </SelectControl>

        <TextInput
          id={idPrefix + '-topic'}
          label='Chủ đề'
          value={topic}
          onChange={(event) => onChange('topic', event.target.value)}
          error={errors.topic}
          hint={countUnicodeCodePoints(topic) + ' / 80 ký tự · Không bắt buộc'}
        />
      </div>

      <fieldset
        className={styles.visibilityGroup}
        aria-invalid={Boolean(errors.visibility)}
        aria-describedby={errors.visibility ? idPrefix + '-visibility-error' : undefined}
      >
        <legend>Phạm vi hiển thị</legend>
        <div className={styles.visibilityOptions}>
          <label className={[styles.visibilityOption, visibility === 'PUBLIC' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
            <input
              type='radio'
              name={idPrefix + '-visibility'}
              value='PUBLIC'
              checked={visibility === 'PUBLIC'}
              onChange={(event) => onChange('visibility', event.target.value)}
            />
            <span>
              <strong>Công khai với cộng đồng</strong>
              <small>Nhận phản hồi từ các thành viên khác.</small>
            </span>
          </label>
          <label className={[styles.visibilityOption, visibility === 'PRIVATE' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
            <input
              type='radio'
              name={idPrefix + '-visibility'}
              value='PRIVATE'
              checked={visibility === 'PRIVATE'}
              onChange={(event) => onChange('visibility', event.target.value)}
            />
            <span>
              <strong>Chỉ mình tôi</strong>
              <small>Lưu lại trong nhật ký cá nhân, không hiện trên bảng tin chung.</small>
            </span>
          </label>
        </div>
        {errors.visibility ? <p id={idPrefix + '-visibility-error'} className={styles.fieldError} role='alert'>{errors.visibility}</p> : null}
      </fieldset>
    </section>
  );
}
