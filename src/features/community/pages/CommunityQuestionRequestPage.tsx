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
      description='Đặt một câu hỏi cụ thể để cộng đồng cùng bạn hiểu sâu hơn về ngôn ngữ.'
      guidanceCards={[
        {
          icon: 'users',
          title: 'Cộng đồng học tập tử tế',
          tone: 'accent',
          description: 'Mỗi câu hỏi là một cơ hội kết nối kiến thức. Hãy đặt câu hỏi với tinh thần xây dựng, tôn trọng văn hóa và sẵn sàng lắng nghe các góc nhìn đa dạng từ người bản xứ.',
        },
        {
          icon: 'check-circle',
          title: 'Mẹo đặt câu hỏi hiệu quả',
          items: [
            { label: 'Cung cấp ngữ cảnh rõ ràng: ', text: 'Bạn gặp câu này ở đâu, trong tình huống nào? Ngữ cảnh giúp người hỗ trợ định hình chính xác văn phong.' },
            { label: 'Giữ nguyên câu gốc: ', text: 'Không cắt xén hoặc thay đổi từ ngữ gốc để người hỗ trợ và thành viên hiểu đúng hoàn toàn ý định của bạn.' },
            { label: 'Lắng nghe đa chiều: ', text: 'Đón nhận góc nhìn từ nhiều thành viên và người bản xứ khác vùng miền để có cái nhìn toàn diện nhất.' },
          ],
        },
        {
          icon: 'circle-help',
          title: 'Cần hỗ trợ sử dụng tính năng?',
          description: 'Xem qua hướng dẫn chi tiết hoặc liên hệ với ban quản trị cộng đồng.',
          link: { label: 'Xem hướng dẫn hỏi đáp', to: '/community' },
        },
      ]}
    >
      <div className={styles.formCard}>
        <h2 id='community-request-form-heading' className={styles.visuallyHidden}>Câu hỏi của bạn</h2>

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

          <div className={[styles.formActions, styles.formActionsQuestion].join(' ')}>
            <span className={styles.actionReassurance}>
              Các câu hỏi rõ ràng, có ngữ cảnh thực tế sẽ giúp cộng đồng hỗ trợ chính xác hơn.
            </span>
            <div className={styles.actionButtons}>
              <Link className={styles.cancelLink} to='/community'>Hủy</Link>
              <Button type='submit' loading={isSubmitting}>Đăng câu hỏi</Button>
            </div>
          </div>
        </form>
      </div>
    </CommunityRequestPageLayout>
  );
}
