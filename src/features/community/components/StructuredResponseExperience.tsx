import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import type { CommunityPost } from '../community.types';
import type {
  CommunityRequestApi,
  CommunityStructuredResponseApi,
  CorrectionRequestResponse,
  StructuredResponseInput,
  StructuredResponseResponse,
} from '../corrections.types';
import { StructuredResponseCard } from './StructuredResponseCard';
import { StructuredResponseEditor } from './StructuredResponseEditor';
import styles from './StructuredResponse.module.css';

const RESPONSE_PAGE_SIZE = 20;

interface StructuredResponseExperienceProps {
  parent: CommunityPost;
  authenticated: boolean;
  api: CommunityStructuredResponseApi;
  requestApi: Pick<CommunityRequestApi, 'getCorrectionRequest'>;
  onAuthRequired: () => void;
}

function isStructuredParent(post: CommunityPost): boolean {
  return post.postType === 'CORRECTION_REQUEST' || post.postType === 'QUESTION';
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'CORRECTIONS_RATE_LIMITED') return 'Bạn đã thao tác khá nhiều. Vui lòng thử lại sau ít phút.';
    if (code === 'CORRECTIONS_ACCEPT_FORBIDDEN') return 'Chỉ người hỏi mới có thể chấp nhận câu trả lời.';
    if (code === 'CORRECTIONS_SELF_VOTE') return 'Bạn không thể đánh dấu phản hồi của chính mình.';
    if (code === 'CORRECTIONS_ACCEPTANCE_CONFLICT') return 'Lựa chọn đã thay đổi. Vui lòng tải lại danh sách.';
  }
  return fallback;
}

function replaceResponse(
  responses: StructuredResponseResponse[],
  replacement: StructuredResponseResponse,
): StructuredResponseResponse[] {
  return responses.map((item) => item.id === replacement.id ? replacement : item);
}

export function StructuredResponseExperience({
  parent,
  authenticated,
  api,
  requestApi,
  onAuthRequired,
}: StructuredResponseExperienceProps) {
  const [correction, setCorrection] = useState<CorrectionRequestResponse | null>(null);
  const [responses, setResponses] = useState<StructuredResponseResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);

  const isCorrection = parent.postType === 'CORRECTION_REQUEST';
  const kind = isCorrection ? ('CORRECTION_PROPOSAL' as const) : ('QA_ANSWER' as const);
  const originalText = correction?.correction.originalText ?? parent.content;
  const sectionTitle = isCorrection ? 'Đề xuất sửa câu' : 'Câu trả lời chuẩn hóa';
  const emptyText = isCorrection
    ? 'Chưa có bản sửa nào. Hãy là người đầu tiên đưa ra một đề xuất có giải thích.'
    : 'Chưa có câu trả lời nào. Hãy chia sẻ góc nhìn giúp người hỏi tiến bộ.';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const responsePromise = api.listStructuredResponses(parent.id, { limit: RESPONSE_PAGE_SIZE }, authenticated);
      const correctionPromise = isCorrection
        ? requestApi.getCorrectionRequest(parent.id, authenticated)
        : Promise.resolve(null);
      const [result, correctionResult] = await Promise.all([responsePromise, correctionPromise]);
      setResponses(result.items);
      setNextCursor(result.nextCursor);
      setCorrection(correctionResult);
    } catch (error) {
      setResponses([]);
      setNextCursor(null);
      setLoadError(errorMessage(error, 'Không thể tải phản hồi có cấu trúc.'));
    } finally {
      setLoading(false);
    }
  }, [api, authenticated, isCorrection, parent.id, requestApi]);

  useEffect(() => {
    if (isStructuredParent(parent)) void load();
  }, [load, parent]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.listStructuredResponses(
        parent.id,
        { limit: RESPONSE_PAGE_SIZE, cursor: nextCursor },
        authenticated,
      );
      setResponses((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setActionError(errorMessage(error, 'Không thể tải thêm phản hồi.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleHelpful = async (response: StructuredResponseResponse) => {
    if (!authenticated) {
      onAuthRequired();
      return;
    }
    setPendingAction('helpful:' + response.id);
    setActionError(null);
    try {
      const updated = response.viewerHelpful
        ? await api.removeStructuredResponseHelpful(response.id)
        : await api.addStructuredResponseHelpful(response.id);
      setResponses((current) => replaceResponse(current, updated));
    } catch (error) {
      setActionError(errorMessage(error, 'Không thể cập nhật đánh dấu hữu ích.'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleAccept = async (response: StructuredResponseResponse) => {
    if (response.isAccepted) {
      setPendingAction('accept:' + response.id);
      setActionError(null);
      try {
        await api.revokeStructuredResponseAcceptance(parent.id);
        setResponses((current) => current.map((item) => ({ ...item, isAccepted: false, acceptedAt: null })));
      } catch (error) {
        setActionError(errorMessage(error, 'Không thể bỏ chấp nhận phản hồi.'));
      } finally {
        setPendingAction(null);
      }
      return;
    }
    if (responses.some((item) => item.isAccepted) && !window.confirm('Thay đổi câu trả lời được chấp nhận?')) return;
    setPendingAction('accept:' + response.id);
    setActionError(null);
    try {
      const accepted = await api.acceptStructuredResponse(parent.id, response.id);
      setResponses((current) => current.map((item) => ({
        ...item,
        isAccepted: item.id === accepted.id,
        acceptedAt: item.id === accepted.id ? accepted.acceptedAt : null,
      })));
    } catch (error) {
      setActionError(errorMessage(error, 'Không thể chấp nhận phản hồi.'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleEditorSubmit = async (input: StructuredResponseInput) => {
    setEditorBusy(true);
    setEditorError(null);
    try {
      const created = await api.createStructuredResponse(parent.id, input);
      setResponses((current) => [created, ...current]);
      setEditorVersion((current) => current + 1);
    } catch (error) {
      setEditorError(errorMessage(error, 'Không thể gửi phản hồi. Nội dung vẫn được giữ lại để thử lại.'));
    } finally {
      setEditorBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby='structured-responses-title'>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{isCorrection ? 'Học cùng cộng đồng' : 'Hỏi và giải đáp'}</p>
          <h2 id='structured-responses-title'>{sectionTitle}</h2>
        </div>
        <span className={styles.status}>{responses.length} phản hồi</span>
      </div>

      <div className={styles.originalBlock}>
        <p className={styles.eyebrow}>{isCorrection ? 'Bản gốc cần xem xét' : 'Câu hỏi của người học'}</p>
        <p>{originalText}</p>
        {correction?.correction.context ? <p className={styles.muted}>{correction.correction.context}</p> : null}
      </div>

      {loading ? (
        <p className={styles.status} role='status' aria-live='polite'>Đang tải phản hồi...</p>
      ) : loadError ? (
        <div role='alert'>
          <p className={styles.error}>{loadError}</p>
          <Button variant='secondary' size='sm' onClick={() => void load()}>Thử lại</Button>
        </div>
      ) : responses.length ? (
        <div className={styles.responseList}>
          {responses.map((response) => (
            <StructuredResponseCard
              key={response.id}
              response={response}
              originalText={originalText}
              authenticated={authenticated}
              pendingAction={pendingAction}
              actionError={actionError}
              onAuthRequired={onAuthRequired}
              onHelpful={(item) => void handleHelpful(item)}
              onAccept={(item) => void handleAccept(item)}
            />
          ))}
          {nextCursor ? (
            <Button
              className={styles.loadMore}
              variant='quiet'
              onClick={() => void handleLoadMore()}
              loading={loadingMore}
            >
              Xem thêm phản hồi
            </Button>
          ) : null}
        </div>
      ) : (
        <p className={styles.empty} role='status'>{emptyText}</p>
      )}

      {parent.isOwner ? (
        <p className={styles.muted}>Bạn là người hỏi. Hãy chọn phản hồi hữu ích nhất khi đã sẵn sàng.</p>
      ) : (
        <StructuredResponseEditor
          key={editorVersion}
          kind={kind}
          originalText={originalText}
          authenticated={authenticated}
          busy={editorBusy}
          error={editorError}
          onAuthRequired={onAuthRequired}
          onSubmit={handleEditorSubmit}
        />
      )}
    </section>
  );
}
