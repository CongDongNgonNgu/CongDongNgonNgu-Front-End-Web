import { useEffect, useState, type FormEvent } from 'react';
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

  useEffect(() => {
    if (!open) return;
    setInput(blankInput(initialLanguageCode));
    setErrors({});
    setSubmitError('');
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
    <Dialog open={open} title='Tạo bài viết cộng đồng' onClose={isSubmitting ? () => undefined : onClose}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.intro}>
          Chia sẻ một câu hỏi, tài nguyên hoặc khoảnh khắc học ngôn ngữ với cộng đồng.
        </p>

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

        <div className={styles.fieldGrid}>
          <SelectControl
            id='community-cefr'
            label='Trình độ CEFR'
            value={input.cefrLevel}
            onChange={(event) => update('cefrLevel', event.target.value)}
            error={errors.cefrLevel}
            hint='Không bắt buộc'
          >
            <option value=''>Chưa chọn</option>
            {COMMUNITY_CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </SelectControl>

          <TextInput
            id='community-topic'
            label='Chủ đề'
            value={input.topic}
            onChange={(event) => update('topic', event.target.value)}
            error={errors.topic}
            hint={countUnicodeCodePoints(input.topic) + ' / 80 ký tự · Không bắt buộc'}
          />
        </div>

        <SelectControl
          id='community-visibility'
          label='Quyền hiển thị'
          value={input.visibility}
          onChange={(event) => update('visibility', event.target.value)}
          error={errors.visibility}
          required
        >
          <option value='PUBLIC'>Công khai</option>
        </SelectControl>

        {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}

        <div className={styles.actions}>
          <Button variant='quiet' type='button' onClick={onClose} disabled={isSubmitting}>Hủy</Button>
          <Button type='submit' loading={isSubmitting}>Đăng bài</Button>
        </div>
      </form>
    </Dialog>
  );
}
