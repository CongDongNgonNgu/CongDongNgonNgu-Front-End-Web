import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { useOptionalAuth } from '../../auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import type { LibraryPublicResource } from '../library.types';
import { AiLearningApi, aiLearningApi } from '../../ai/learning/ai-learning.api';
import type { AiLearningRequestClient, AiLearningResult } from '../../ai/learning/ai-learning.types';
import styles from './LibraryLearnFromResourcePanel.module.css';

interface LibraryLearnFromResourcePanelProps {
  resource: LibraryPublicResource;
  api?: { learn: (input: { resourceId: string }) => Promise<AiLearningResult> };
  requestClient?: AiLearningRequestClient;
  authenticated?: boolean;
}

export function LibraryLearnFromResourcePanel({
  resource,
  api,
  requestClient,
  authenticated: authenticatedOverride,
}: LibraryLearnFromResourcePanelProps) {
  const auth = useOptionalAuth();
  const authenticated = authenticatedOverride ?? auth?.status === 'authenticated';
  const learningApi = api ?? (requestClient ? new AiLearningApi(requestClient) : auth ? new AiLearningApi(auth.api) : aiLearningApi);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiLearningResult | null>(null);

  async function learn() {
    if (!authenticated || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      setResult(await learningApi.learn({ resourceId: resource.id }));
    } catch (requestError) {
      setResult(null);
      setError(readLearningError(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby='learn-from-resource-heading'>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>LEARN FROM VERIFIED SOURCE</p>
          <h2 id='learn-from-resource-heading'>Học từ bài này</h2>
          <p className={styles.lede}>Bóc tách từ vựng, ngữ pháp và bài tập phản xạ từ tài nguyên đã được kiểm duyệt.</p>
        </div>
        <div className={styles.actionRail}>
          <span className={styles.sourceCue}>Nguồn: {resource.reviewState} · {resource.primaryLanguageCode.toUpperCase()}</span>
          <Button variant='secondary' size='lg' loading={isLoading} disabled={!authenticated} onClick={() => void learn()}>
            {isLoading ? 'Đang phân tích' : '⚡ Học từ bài này'}
          </Button>
        </div>
      </div>

      {!authenticated ? (
        <div className={styles.authNotice} role='note'>
          <div><strong>Đăng nhập để tạo bài học riêng</strong><p>Nguồn verified vẫn chỉ đọc; kết quả học được tạo cho phiên học của bạn.</p></div>
          <Link to='/login' state={{ from: `/library/${resource.id}` }}>Đăng nhập →</Link>
        </div>
      ) : null}
      {isLoading ? <div className={styles.loading} role='status' aria-live='polite' aria-busy='true'>Đang trích xuất cấu trúc bài học từ nguồn mở…</div> : null}
      {error ? <div className={styles.error} role='alert'><div><strong>Chưa thể tạo bài học</strong><p>{error}</p></div><Button variant='quiet' size='sm' onClick={() => void learn()} disabled={!authenticated}>Thử lại</Button></div> : null}
      {result ? <LearningResult result={result} /> : null}
    </section>
  );
}

function LearningResult({ result }: { result: AiLearningResult }) {
  const output = result.output;
  const sourceLink = result.sourceResource.provenance
    .map((entry) => safeExternalUrl(entry.sourceUrl))
    .find((entry): entry is string => Boolean(entry)) ?? null;
  return (
    <div className={styles.result}>
      <div className={styles.aiNotice} role='note'>
        <strong>Nội dung học do AI tạo</strong>
        <p>Đây là bạn đồng hành tự luyện, tách biệt với tài nguyên verified. Hãy đối chiếu sắc thái văn hoá với nguồn gốc khi cần.</p>
      </div>
      <div className={styles.resultHeading}>
        <div><p className={styles.eyebrow}>KẾT QUẢ CÓ CẤU TRÚC</p><h3>{output.summary}</h3></div>
        <span className={styles.sourceBadge}>AI_GENERATED</span>
      </div>
      <p className={styles.attributionLine}>
        Dựa trên nguồn {result.sourceResource.resourceType.toLowerCase()} đã xác minh ·{' '}
        {sourceLink ? <a href={sourceLink} target='_blank' rel='noreferrer'>xem nguồn gốc ↗</a> : 'nguồn gốc được ghi nhận trong Library'}
      </p>
      <div className={styles.sectionGrid}>
        <StudySection title='01 · Từ vựng then chốt'>
          <div className={styles.vocabularyList}>{output.vocabulary.map((item) => <article className={styles.item} key={`${item.term}-${item.meaning}`}><strong>{item.term}</strong><p>{item.meaning}</p><span>{item.exampleSentence}</span></article>)}</div>
        </StudySection>
        <StudySection title='02 · Ngữ pháp & sắc thái'>
          <div className={styles.itemList}>{output.grammarNotes.map((item) => <article className={styles.item} key={`${item.title}-${item.example}`}><strong>{item.title}</strong><p>{item.explanation}</p><span>{item.example}</span></article>)}</div>
        </StudySection>
        <StudySection title='03 · Câu hỏi đọc hiểu'>
          <ol className={styles.numberedList}>{output.questions.map((item) => <li key={item.question}><strong>{item.question}</strong><span>Gợi ý: {item.answerGuide}</span></li>)}</ol>
        </StudySection>
        <StudySection title='04 · Trắc nghiệm phản xạ'>
          <div className={styles.quizList}>{output.miniQuiz.map((item, index) => <details className={styles.quizItem} key={`${item.question}-${index}`}><summary>{item.question}</summary><ol>{item.options.map((option, optionIndex) => <li key={option} className={optionIndex === item.correctOptionIndex ? styles.correctOption : undefined}>{option}</li>)}</ol><p>{item.explanation}</p></details>)}</div>
        </StudySection>
        <StudySection title='05 · Luyện nói & nhập vai'>
          <div className={styles.itemList}>{output.speakingPrompts.map((item) => <article className={styles.item} key={`${item.prompt}-${item.followUp}`}><strong>{item.prompt}</strong><span>Gợi ý tiếp: {item.followUp}</span></article>)}</div>
        </StudySection>
      </div>
    </div>
  );
}

function StudySection({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = title.replace(/ /g, '-');
  return <section className={styles.studySection} aria-labelledby={headingId}><h4 id={headingId}>{title}</h4>{children}</section>;
}

function readLearningError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return 'Hạn ngạch hoặc tốc độ sử dụng AI đã đạt giới hạn an toàn. Hãy thử lại sau.';
    if (error.status === 503) return 'Dịch vụ học AI đang tạm ngoại tuyến. Tài nguyên gốc vẫn không thay đổi.';
    if (error.status === 404 || error.status === 422) return 'Tài nguyên này không còn đủ điều kiện để tạo bài học.';
    return error.message;
  }
  return 'Không thể kết nối tới dịch vụ học. Hãy thử lại sau.';
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
