import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Overlays';
import { SelectControl, TextInput, Textarea } from '../../../components/ui/FormControls';
import { COMMUNITY_CEFR_LEVELS, COMMUNITY_POST_TYPES } from '../community.types';
import type {
  CommunityComposerInput,
  CommunityCreatePostInput,
  CommunityPost,
} from '../community.types';
import { COMMUNITY_POST_TYPE_LABELS } from '../community.constants';
import {
  buildCreatePostPayload,
  countUnicodeCodePoints,
  validateComposerInput,
  type ComposerValidationErrors,
} from '../community-validation';
import styles from './CommunityComposer.module.css';

export interface CommunityComposerApiPort {
  createPost: (input: CommunityCreatePostInput) => Promise<CommunityPost>;
}

interface CommunityComposerProps {
  open: boolean;
  authenticated: boolean;
  languages: Array<{
    code: string;
    nativeName: string;
    englishName: string;
  }>;
  initialLanguageCode?: string;
  api: CommunityComposerApiPort;
  onClose: () => void;
  onCreated: (post: CommunityPost) => void;
  onAuthRequired: () => void;
}

function blankInput(languageCode = ''): CommunityComposerInput {
  return {
    postType: '',
    languageCode,
    content: '',
    cefrLevel: '',
    topic: '',
    visibility: 'PUBLIC',
  };
}

export function CommunityComposer({
  open,
  authenticated,
  languages,
  initialLanguageCode = '',
  api,
  onClose,
  onCreated,
  onAuthRequired,
}: CommunityComposerProps) {
  const [input, setInput] = useState(() => blankInput(initialLanguageCode));
  const [errors, setErrors] = useState<ComposerValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const metadataRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!open) return;
    setInput(blankInput(initialLanguageCode));
    setErrors({});
    setSubmitError('');
    if (metadataRef.current) {
      metadataRef.current.open = typeof window === 'undefined' || window.innerWidth > 560;
    }
  }, [initialLanguageCode, open]);

  const update = (field: keyof CommunityComposerInput, value: string) => {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      onAuthRequired();
      return;
    }

    const nextErrors = validateComposerInput(input);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const post = await api.createPost(buildCreatePostPayload(input));
      onCreated(post);
      setInput(blankInput(initialLanguageCode));
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof ApiClientError && error.status === 429
          ? 'Bạn đã đăng quá nhiều bài. Vui lòng thử lại sau ít phút.'
          : 'Không thể đăng bài viết lúc này. Vui lòng thử lại sau ít phút.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      title='Chia sẻ bài viết'
      description={(
        <>
          <span className={styles.desktopDescription}>
            Không gian đóng góp tri thức và thảo luận mở bằng văn bản thuần dành cho người học ngôn ngữ. Nội dung tôn trọng sự chân thực và văn hóa giao lưu.
          </span>
          <span className={styles.mobileDescription}>Văn bản học thuật &amp; đàm thoại bản xứ</span>
        </>
      )}
      variant='composer'
      onClose={isSubmitting ? () => undefined : onClose}
      footer={(
        <div className={styles.actions}>
          <Button variant='quiet' type='button' onClick={onClose} disabled={isSubmitting}>Hủy</Button>
          <Button className={styles.publishAction} type='submit' form='community-composer-form' loading={isSubmitting}>Đăng bài</Button>
        </div>
      )}
    >
      <form id='community-composer-form' className={styles.form} onSubmit={handleSubmit} noValidate>

        <div className={styles.fieldGrid}>
          <SelectControl
            id='community-post-type'
            label='Loại bài viết'
            value={input.postType}
            onChange={(event) => update('postType', event.target.value)}
            error={errors.postType}
            required
          >
            <option value=''>Chọn loại bài viết</option>
            {COMMUNITY_POST_TYPES.map((type) => (
              <option key={type} value={type}>{COMMUNITY_POST_TYPE_LABELS[type]}</option>
            ))}
          </SelectControl>

          <SelectControl
            id='community-language'
            label='Ngôn ngữ mục tiêu'
            value={input.languageCode}
            onChange={(event) => update('languageCode', event.target.value)}
            error={errors.languageCode}
            required
          >
            <option value=''>Chọn ngôn ngữ</option>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName} · {language.englishName}
              </option>
            ))}
          </SelectControl>
        </div>

        <Textarea
          id='community-content'
          label='Nội dung'
          value={input.content}
          onChange={(event) => update('content', event.target.value)}
          error={errors.content}
          hint='Văn bản thuần túy, không chèn liên kết hay tệp đính kèm.'
          required
          rows={7}
        />
        <p className={styles.charCount} aria-live='polite'>
          {countUnicodeCodePoints(input.content).toLocaleString('vi-VN')} / 20.000 ký tự
        </p>

        <details
          ref={metadataRef}
          className={styles.optionalMetadata}
        >
          <summary>
            <span>Thông tin học tập (không bắt buộc)</span>
            <span className={styles.metadataSummaryHint}>Bổ trợ ngữ cảnh</span>
          </summary>
          <div className={styles.metadataFields}>
            <div className={styles.fieldGrid}>
              <SelectControl
                id='community-cefr'
                label='Khung tham chiếu trình độ (CEFR)'
                value={input.cefrLevel}
                onChange={(event) => update('cefrLevel', event.target.value)}
                error={errors.cefrLevel}
                hint='Không bắt buộc'
              >
                <option value=''>Không xác định</option>
                {COMMUNITY_CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </SelectControl>

              <TextInput
                id='community-topic'
                label='Chủ đề / Ngữ cảnh thảo luận'
                value={input.topic}
                onChange={(event) => update('topic', event.target.value)}
                error={errors.topic}
                hint={countUnicodeCodePoints(input.topic) + ' / 80 ký tự · Không bắt buộc'}
              />
            </div>
          </div>
        </details>

        <fieldset className={styles.visibilityGroup} aria-invalid={Boolean(errors.visibility)} aria-describedby={errors.visibility ? 'community-visibility-error' : undefined}>
          <legend>Phạm vi hiển thị</legend>
          <div className={styles.visibilityOptions}>
            <label className={[styles.visibilityOption, input.visibility === 'PUBLIC' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
              <input
                type='radio'
                name='community-visibility'
                value='PUBLIC'
                checked={input.visibility === 'PUBLIC'}
                onChange={(event) => update('visibility', event.target.value)}
              />
              <span className={styles.visibilityCopy}>
                <strong>Công khai với cộng đồng (PUBLIC)</strong>
                <span>Hiển thị trên bảng tin chung để nhận phản hồi từ mọi thành viên.</span>
              </span>
            </label>
            <label className={[styles.visibilityOption, input.visibility === 'PRIVATE' ? styles.visibilityOptionSelected : ''].filter(Boolean).join(' ')}>
              <input
                type='radio'
                name='community-visibility'
                value='PRIVATE'
                checked={input.visibility === 'PRIVATE'}
                onChange={(event) => update('visibility', event.target.value)}
              />
              <span className={styles.visibilityCopy}>
                <strong>Chỉ lưu vào nhật ký cá nhân (PRIVATE)</strong>
                <span>Chỉ bạn mới có quyền xem lại ghi chép này trong hồ sơ.</span>
              </span>
            </label>
          </div>
          {errors.visibility ? <p id='community-visibility-error' className={styles.visibilityError} role='alert'>{errors.visibility}</p> : null}
        </fieldset>

        {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
      </form>
    </Dialog>
  );
}
