import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/FormControls';
import { useAuth } from '../../auth/AuthProvider';
import { languageApi } from '../../languages/api/language-api';
import type { LanguageCatalogItem } from '../../languages/languages.types';
import { correctionsApi } from '../api/corrections-api';
import { CorrectionIntentOptions } from '../components/CorrectionIntentOptions';
import {
  CommunityRequestPageLayout,
  RequestAccessLoadingState,
  RequestRedirectingState,
} from '../components/CommunityRequestPageLayout';
import { CatalogError, TargetLanguageSelect } from '../components/TargetLanguageSelect';
import { RequestMetadataFields } from '../components/RequestMetadataFields';
import { communityRequestErrorMessage } from '../corrections-errors';
import {
  buildCorrectionRequestPayload,
  validateCorrectionRequestInput,
  type CorrectionRequestFormInput,
  type CorrectionRequestValidationErrors,
  MAX_CORRECTION_TEXT_CODE_POINTS,
} from '../corrections-validation';
import type { CommunityLanguageCatalogApi, CommunityRequestApi } from '../corrections.types';
import { countUnicodeCodePoints } from '../community-validation';
import styles from './CommunityRequestPage.module.css';

interface CommunityCorrectionRequestPageProps {
  api?: CommunityRequestApi;
  catalogApi?: CommunityLanguageCatalogApi;
}

export function CommunityCorrectionRequestPage({
  api = correctionsApi,
  catalogApi = languageApi,
}: CommunityCorrectionRequestPageProps) {
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
  return <CommunityCorrectionRequestPageView api={api} catalogApi={catalogApi} />;
}

export interface CommunityCorrectionRequestPageViewProps {
  api: CommunityRequestApi;
  catalogApi: CommunityLanguageCatalogApi;
}

export function CommunityCorrectionRequestPageView({
  api,
  catalogApi,
}: CommunityCorrectionRequestPageViewProps) {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<LanguageCatalogItem[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState(false);
  const [input, setInput] = useState<CorrectionRequestFormInput>({
    languageCode: '',
    originalText: '',
    correctionIntent: '',
    context: '',
    cefrLevel: '',
    topic: '',
    visibility: 'PUBLIC',
  });
  const [errors, setErrors] = useState<CorrectionRequestValidationErrors>({});
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
    document.title = 'Nhờ cộng đồng sửa giúp | CongDongNgonNgu.vn';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const update = (field: keyof CorrectionRequestFormInput, value: string) => {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateCorrectionRequestInput(input);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await api.createCorrectionRequest(buildCorrectionRequestPayload(input));
      if (!response.post?.id) throw new Error('CORRECTION_POST_ID_MISSING');
      navigate('/community/posts/' + encodeURIComponent(response.post.id));
    } catch (error) {
      setSubmitError(communityRequestErrorMessage(error, 'correction'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CommunityRequestPageLayout
      breadcrumb='Nhờ cộng đồng sửa giúp'
      eyebrow='NHỜ CỘNG ĐỒNG SỬA GIÚP'
      title='Nhờ cộng đồng sửa giúp'
      description='Chia sẻ một câu bạn đang học để cộng đồng góp ý rõ ràng và tôn trọng.'
      guidanceCards={[
        {
          icon: 'users',
          title: 'Cộng đồng học tập tử tế',
          description: 'Mỗi câu bạn gửi gắm là một cơ hội học hỏi chung. Người sửa sẽ giải thích ngọn ngành ngữ cảnh thay vì chỉ đưa ra một đáp án khô khan.',
        },
        {
          icon: 'sparkles',
          title: 'Gợi ý để nhận phản hồi chất lượng',
          items: [
            { label: 'Cung cấp ngữ cảnh rõ ràng: ', text: 'Bạn định dùng câu này với ai và trong tình huống nào?' },
            { label: 'Giữ nguyên câu gốc: ', text: 'Không cần ngại sai sót; lỗi sai thực tế giúp bạn nhớ lâu hơn.' },
            { label: 'Lắng nghe đa chiều: ', text: 'Ngôn ngữ sống luôn có nhiều cách diễn đạt phù hợp tùy đối tượng.' },
          ],
        },
        {
          icon: 'user-round',
          title: 'Cam kết không sử dụng AI tạo tự động',
          tone: 'muted',
          description: 'Mọi lời góp ý đến từ sự sẻ chia của con người thực. Chúng tôi không dùng bot tạo gợi ý sửa giả để đảm bảo tính nhân văn và chiều sâu văn hóa.',
        },
      ]}
    >
      <div className={styles.formCard}>
        <h2 id='community-request-form-heading' className={styles.visuallyHidden}>Gửi câu cần được góp ý</h2>

        <form className={styles.form} onSubmit={submit} noValidate>
          {languagesError ? <CatalogError onRetry={() => void loadLanguages()} /> : null}

          <TargetLanguageSelect
            id='correction-language'
            value={input.languageCode}
            languages={languages}
            loading={languagesLoading}
            error={errors.languageCode}
            onChange={(value) => update('languageCode', value)}
          />

          <Textarea
            id='correction-original-text'
            label='Câu hoặc đoạn văn bản cần sửa'
            value={input.originalText}
            onChange={(event) => update('originalText', event.target.value)}
            error={errors.originalText}
            hint='Giữ nguyên dấu cách và xuống dòng.'
            required
          />
          <p className={styles.charCount} aria-live='polite'>
            {countUnicodeCodePoints(input.originalText)} / {MAX_CORRECTION_TEXT_CODE_POINTS.toLocaleString('vi-VN')} ký tự
          </p>

          <CorrectionIntentOptions
            value={input.correctionIntent}
            error={errors.correctionIntent}
            onChange={(value) => update('correctionIntent', value)}
          />

          <RequestMetadataFields
            idPrefix='correction'
            context={{
              value: input.context,
              error: errors.context,
              onChange: (value) => update('context', value),
            }}
            cefrLevel={input.cefrLevel}
            topic={input.topic}
            visibility={input.visibility as 'PUBLIC' | 'PRIVATE'}
            errors={errors}
            onChange={(field, value) => update(field, value)}
          />

          {submitError ? <p className={styles.submitError} role='alert'>{submitError}</p> : null}
          <p className={styles.submitStatus} aria-live='polite' aria-atomic='true'>
            {isSubmitting ? 'Đang gửi yêu cầu…' : ''}
          </p>

          <div className={[styles.formActions, styles.formActionsCorrection].join(' ')}>
            <Button type='submit' loading={isSubmitting}>Gửi yêu cầu sửa</Button>
            <Link className={styles.cancelLink} to='/community'>Hủy</Link>
            <span className={styles.actionReassurance}>
              Tuân thủ nguyên tắc cộng đồng học tập phi thương mại.
            </span>
          </div>
        </form>
      </div>
    </CommunityRequestPageLayout>
  );
}
