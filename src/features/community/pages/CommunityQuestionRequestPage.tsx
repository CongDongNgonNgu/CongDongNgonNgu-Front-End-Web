import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/FormControls';
import { useAuth } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { correctionsApi } from '../api/corrections-api';
import {
  CommunityRequestPageLayout,
  RequestAccessLoadingState,
  RequestRedirectingState,
} from '../components/CommunityRequestPageLayout';
import { CatalogError, TargetLanguageSelect } from '../components/TargetLanguageSelect';
import { RequestMetadataFields } from '../components/RequestMetadataFields';
import { communityRequestErrorMessage } from '../corrections-errors';
import {
  buildQuestionPayload,
  validateQuestionInput,
  type QuestionFormInput,
  type QuestionValidationErrors,
  MAX_CORRECTION_TEXT_CODE_POINTS,
} from '../corrections-validation';
import type { CommunityLanguageCatalogApi, CommunityRequestApi } from '../corrections.types';
import { countUnicodeCodePoints } from '../community-validation';
import styles from './CommunityRequestPage.module.css';

interface CommunityQuestionRequestPageProps {
  api?: CommunityRequestApi;
  catalogApi?: CommunityLanguageCatalogApi;
}

export function CommunityQuestionRequestPage({
  api = correctionsApi,
  catalogApi = languageApi,
}: CommunityQuestionRequestPageProps) {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [location.pathname, navigate, status]);

  if (status === 'loading') return <RequestAccessLoadingState />;
  if (status !== 'authenticated') return <RequestRedirectingState />;
  return <CommunityQuestionRequestPageView api={api} catalogApi={catalogApi} />;
}

export interface CommunityQuestionRequestPageViewProps {
  api: CommunityRequestApi;
  catalogApi: CommunityLanguageCatalogApi;
}

export function CommunityQuestionRequestPageView({
  api,
  catalogApi,
}: CommunityQuestionRequestPageViewProps) {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState(false);
  const [input, setInput] = useState<QuestionFormInput>({
    languageCode: '',
    content: '',
    cefrLevel: '',
    topic: '',
    visibility: 'PUBLIC',
  });
  const [errors, setErrors] = useState<QuestionValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLanguages = useCallback(async () => {
    setLanguagesLoading(true);
    setLanguagesError(false);
    try {
      const result = await catalogApi.listLanguages();
      setLanguages(result.filter((language) => language.active));
    } catch {
      setLanguages([]);
      setLanguagesError(true);
    } finally {
      setLanguagesLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    void loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Đặt câu hỏi | CongDongNgonNgu.vn';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const update = (field: keyof QuestionFormInput, value: string) => {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateQuestionInput(input);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const post = await api.createQuestion(buildQuestionPayload(input));
      if (!post?.id) throw new Error('QUESTION_POST_ID_MISSING');
      navigate('/community/posts/' + encodeURIComponent(post.id));
    } catch (error) {
      setSubmitError(communityRequestErrorMessage(error, 'question'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CommunityRequestPageLayout
      breadcrumb='Đặt câu hỏi'
      eyebrow='ĐẶT CÂU HỎI'
      title='Đặt câu hỏi'
      description='Đưa một câu hỏi thật của bạn vào cộng đồng và nhận những cách giải thích gần với trải nghiệm học tập thực tế.'
      asideTitle='Một câu hỏi tốt mở ra nhiều cách học'
      asideDescription='Bạn không cần biết trước câu trả lời. Chỉ cần nói rõ điều mình đang thắc mắc và chọn đúng ngôn ngữ.'
      asideItems={[
        'Viết thẳng điều bạn muốn hiểu, không cần thêm tiêu đề riêng.',
        'Thêm chủ đề hoặc trình độ để câu trả lời phù hợp hơn.',
        'Ví dụ chỉ là gợi ý, không được gửi cùng nội dung câu hỏi.',
      ]}
    >
      <div className={styles.formCard}>
        <div className={styles.formIntro}>
          <h2 id='community-request-form-heading'>Câu hỏi của bạn</h2>
          <p>Viết như đang hỏi một người bạn am hiểu ngôn ngữ, có thể giữ nguyên dấu cách và xuống dòng.</p>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          {languagesError ? <CatalogError onRetry={() => void loadLanguages()} /> : null}

          <TargetLanguageSelect
            id='question-language'
            value={input.languageCode}
            languages={languages}
            loading={languagesLoading}
            error={errors.languageCode}
            onChange={(value) => update('languageCode', value)}
          />

          <Textarea
            id='question-content'
            label='Nội dung câu hỏi'
            value={input.content}
            onChange={(event) => update('content', event.target.value)}
            error={errors.content}
            hint='Bạn có thể giữ nguyên dấu cách và xuống dòng.'
            required
          />
          <p className={styles.charCount} aria-live='polite'>
            {countUnicodeCodePoints(input.content)} / {MAX_CORRECTION_TEXT_CODE_POINTS.toLocaleString('vi-VN')} ký tự
          </p>

          <div className={styles.examples} aria-label='Ví dụ câu hỏi'>
            <strong>Gợi ý cách bắt đầu</strong>
            <span>“Sự khác nhau giữa hai cách diễn đạt?”</span>
            <span>“Câu này dùng trong hoàn cảnh nào?”</span>
            <span>“Từ này có tự nhiên trong hội thoại không?”</span>
            <span>“Ngữ pháp của mẫu câu này hoạt động thế nào?”</span>
          </div>

          <RequestMetadataFields
            idPrefix='question'
            cefrLevel={input.cefrLevel}
            topic={input.topic}
            visibility={input.visibility as 'PUBLIC' | 'PRIVATE'}
            errors={errors}
            onChange={(field, value) => update(field, value)}
          />

          {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
          <p className={styles.submitStatus} aria-live='polite' aria-atomic='true'>
            {isSubmitting ? 'Đang gửi câu hỏi…' : ''}
          </p>

          <div className={styles.formActions}>
            <Link className={styles.cancelLink} to='/community'>Hủy</Link>
            <Button type='submit' loading={isSubmitting}>Đăng câu hỏi</Button>
          </div>
        </form>
      </div>
    </CommunityRequestPageLayout>
  );
}
