import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { communityApi } from '../api/community-api';
import type { CommunityComposerApiPort } from '../components/CommunityComposer';
import type { CommunityPostActionsApi } from '../components/CommunityPostCard';
import './CommunityPostDetailPage.css';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog } from '../../../components/ui/Overlays';
import { Icon } from '../../../components/ui/Icon/Icon';

import type {
  CommunityComment,
  CommunityCommentListResponse,
  CommunityCommentQuery,
  CommunityCommentThread,
  CommunityCreateCommentInput,
  CommunityDeleteResponse,
  CommunityPost,
  CommunityPostUpdateInput,
  CommunityReportCategory,
  CommunityUpdateCommentInput,
} from '../community.types';
import { COMMUNITY_REPORT_CATEGORIES, COMMUNITY_REPORT_CATEGORY_LABELS } from '../community.constants';
import {
  MAX_COMMUNITY_COMMENT_CONTENT_CODE_POINTS,
  validateCommentInput,
  validateReportInput,
} from '../community-validation';

const COMMENT_PAGE_SIZE = 20;
const MAX_COMMENT_CODE_POINTS = MAX_COMMUNITY_COMMENT_CONTENT_CODE_POINTS;

export interface CommunityPostDetailApi extends CommunityComposerApiPort, CommunityPostActionsApi {
  getPost: (
    postId: string,
    authenticated: boolean,
  ) => Promise<CommunityPost>;
  listComments: (
    postId: string,
    query: CommunityCommentQuery,
    authenticated: boolean,
  ) => Promise<CommunityCommentListResponse>;
  updatePost: (
    postId: string,
    input: CommunityPostUpdateInput,
  ) => Promise<CommunityPost>;
  deletePost: (postId: string) => Promise<CommunityDeleteResponse>;
  createComment: (
    postId: string,
    input: CommunityCreateCommentInput,
  ) => Promise<CommunityComment>;
  updateComment: (
    commentId: string,
    input: CommunityUpdateCommentInput,
  ) => Promise<CommunityComment>;
  deleteComment: (commentId: string) => Promise<CommunityDeleteResponse>;
  reportComment: CommunityPostActionsApi['reportPost'];
}

export interface CommunityPostDetailPageViewProps {
  api: CommunityPostDetailApi;
  postId: string;
  authenticated?: boolean;
  currentUserId?: string | null;
  onAuthRequired?: () => void;
}

interface ReportTarget {
  type: 'POST' | 'COMMENT';
  id: string;
}

interface DetailError {
  message: string;
  unavailable: boolean;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function isUnavailableError(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: unknown }).status === 404
  ) {
    return true;
  }

  return /(?:NOT_FOUND|UNAVAILABLE|MODERATED)/.test(getErrorCode(error) ?? '');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getThread(comment: CommunityComment): CommunityCommentThread {
  return comment as CommunityCommentThread;
}

function getAuthorName(comment: CommunityComment): string {
  return comment.author?.displayName ?? 'Thành viên ẩn danh';
}

function isOwnerComment(
  comment: CommunityComment,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(
    currentUserId && comment.author?.id && comment.author.id === currentUserId,
  );
}

function commentText(comment: CommunityComment): string {
  if (comment.isDeleted) return 'Bình luận đã bị xóa';
  return comment.content ?? '';
}

function uniqueComments(
  current: CommunityComment[],
  incoming: CommunityComment[],
): CommunityComment[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function asThread(comment: CommunityComment): CommunityCommentThread {
  return {
    ...comment,
    replies: [],
    hasMoreReplies: false,
  };
}

function mergeThreads(
  current: CommunityCommentThread[],
  incoming: CommunityCommentThread[],
): CommunityCommentThread[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => {
    const existing = byId.get(item.id);
    byId.set(
      item.id,
      existing
        ? {
            ...existing,
            ...item,
            replies: uniqueComments(existing.replies, item.replies),
          }
        : item,
    );
  });
  return [...byId.values()];
}

function appendComment(
  current: CommunityCommentThread[],
  created: CommunityComment,
): CommunityCommentThread[] {
  if (!created.parentCommentId) return mergeThreads(current, [asThread(created)]);
  return current.map((thread) =>
    thread.id === created.parentCommentId
      ? {
          ...thread,
          replies: uniqueComments(thread.replies, [created]),
        }
      : thread,
  );
}

function updateCommentTree(
  current: CommunityCommentThread[],
  updated: CommunityComment,
): CommunityCommentThread[] {
  return current.map((thread) => {
    if (thread.id === updated.id) {
      return {
        ...thread,
        ...updated,
        replies: thread.replies,
        hasMoreReplies: thread.hasMoreReplies,
      };
    }
    return {
      ...thread,
      replies: thread.replies.map((reply) =>
        reply.id === updated.id ? updated : reply,
      ),
    };
  });
}

export function CommunityPostDetailPageView({
  api,
  postId,
  authenticated = false,
  currentUserId,
  onAuthRequired,
}: CommunityPostDetailPageViewProps) {
  const navigate = useNavigate();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState<DetailError | null>(null);
  const [comments, setComments] = useState<CommunityCommentThread[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentFormError, setCommentFormError] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<CommunityComment | null>(
    null,
  );
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [commentDeleting, setCommentDeleting] = useState<CommunityComment | null>(
    null,
  );
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportCategory, setReportCategory] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostDraft, setEditPostDraft] = useState('');
  const [postSaving, setPostSaving] = useState(false);
  const [postDeleting, setPostDeleting] = useState(false);
  const [confirmPostDelete, setConfirmPostDelete] = useState(false);
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [postDeleteFocusPending, setPostDeleteFocusPending] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
  const postMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const commentMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const commentsHeadingRef = useRef<HTMLHeadingElement>(null);
  const postStateHeadingRef = useRef<HTMLHeadingElement>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [shareHref, setShareHref] = useState('');

  const loadPost = useCallback(async () => {
    setPostLoading(true);
    setPostError(null);
    try {
      const result = await api.getPost(postId, authenticated);
      setPost(result);
    } catch (error) {
      setPost(null);
      setPostError({
        message: isUnavailableError(error)
          ? 'Bài viết không khả dụng'
          : 'Không thể tải bài viết',
        unavailable: isUnavailableError(error),
      });
    } finally {
      setPostLoading(false);
    }
  }, [api, authenticated, postId]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await api.listComments(
        postId,
        { limit: COMMENT_PAGE_SIZE },
        authenticated,
      );
      setComments(result.items);
      setNextCursor(result.nextCursor ?? null);
    } catch {
      setComments([]);
      setNextCursor(null);
      setCommentsError('Không thể tải bình luận');
    } finally {
      setCommentsLoading(false);
    }
  }, [api, authenticated, postId]);

  useEffect(() => {
    void loadPost();
    void loadComments();
  }, [loadComments, loadPost]);

  useEffect(() => {
    if (!postDeleteFocusPending || !postError) return;
    postStateHeadingRef.current?.focus();
    setPostDeleteFocusPending(false);
  }, [postDeleteFocusPending, postError]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.listComments(
        postId,
        { limit: COMMENT_PAGE_SIZE, cursor: nextCursor },
        authenticated,
      );
      setComments((current) => mergeThreads(current, result.items));
      setNextCursor(result.nextCursor ?? null);
    } catch {
      setCommentsError('Không thể tải thêm bình luận');
    } finally {
      setLoadingMore(false);
    }
  }, [api, authenticated, loadingMore, nextCursor, postId]);

  const handleRequireAuth = useCallback(() => {
    onAuthRequired?.();
  }, [onAuthRequired]);

  const handlePostAction = useCallback(
    async (action: 'helpful' | 'save' | 'share') => {
      if (!post) return;
      if (action !== 'share' && !authenticated) {
        handleRequireAuth();
        return;
      }

      setActionPending(action);
      setPostActionError(null);
      try {
        if (action === 'helpful') {
          const response = post.viewerReacted
            ? await api.removeHelpful(post.id)
            : await api.addHelpful(post.id);
          setPost((current) => current
            ? {
                ...current,
                viewerReacted: response.reacted,
                helpfulCount: response.helpfulCount,
              }
            : current);
        } else if (action === 'save') {
          const response = post.isSaved
            ? await api.unsavePost(post.id)
            : await api.savePost(post.id);
          setPost((current) => current
            ? { ...current, isSaved: response.saved }
            : current);
        } else {
          const response = await api.getShareLink(post.id);
          if (
            !response.isShareable
            || !response.canonicalPath
            || !response.canonicalPath.startsWith('/')
            || response.canonicalPath.startsWith('//')
          ) {
            throw new Error('SHARE_LINK_UNAVAILABLE');
          }
          setShareHref(response.canonicalPath);
          setShareMessage('Li�n j��y��y�t chia r��y��y� �w^~)�u� r��y��y�n s�ng.');
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(
                new URL(response.canonicalPath, window.location.origin).toString(),
              );
              setShareMessage('� sao ch�p li�n j��y��y�t chia r��y��y�.');
            } catch {
              // The link remains available when clipboard permission is denied.
            }
          }
        }
      } catch {
        setPostActionError('Thao tác chưa hoàn tất. Vui lòng thử lại sau ít phút.');
      } finally {
        setActionPending(null);
      }
    },
    [api, authenticated, handleRequireAuth, post],
  );

  const handleCommentSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!post) return;
      if (!authenticated) {
        handleRequireAuth();
        return;
      }

      const validation = validateCommentInput({ content: commentDraft });
      if (validation.content) {
        setCommentFormError(validation.content);
        return;
      }

      setCommentSubmitting(true);
      setCommentFormError(null);
      const input: CommunityCreateCommentInput = {
        content: commentDraft.trim(),
        ...(replyTo ? { parentCommentId: replyTo.id } : {}),
      };
      try {
        const created = await api.createComment(post.id, input);
        setComments((current) => appendComment(current, created));
        setCommentDraft('');
        setReplyTo(null);
        setPost((current) =>
          current
            ? { ...current, commentCount: (current.commentCount ?? 0) + 1 }
            : current,
        );
      } catch {
        setCommentFormError('Không thể gửi bình luận. Giữ nguyên nội dung để thử lại.');
      } finally {
        setCommentSubmitting(false);
      }
    },
    [
      api,
      authenticated,
      commentDraft,
      handleRequireAuth,
      post,
      replyTo,
    ],
  );

  const handleCommentUpdate = useCallback(async () => {
    if (!editingComment) return;
    const validation = validateCommentInput({ content: editCommentDraft });
    if (validation.content) {
      setCommentFormError(validation.content);
      return;
    }

    setCommentSubmitting(true);
    setCommentFormError(null);
    try {
      const updated = await api.updateComment(editingComment.id, {
        content: editCommentDraft.trim(),
      });
      setComments((current) => updateCommentTree(current, updated));
      setEditingComment(null);
      setEditCommentDraft('');
    } catch {
      setCommentFormError('Không thể cập nhật bình luận.');
    } finally {
      setCommentSubmitting(false);
    }
  }, [api, editCommentDraft, editingComment]);

  const handleCommentDelete = useCallback(async () => {
    if (!commentDeleting) return;
    setCommentSubmitting(true);
    try {
      await api.deleteComment(commentDeleting.id);
      setComments((current) =>
        updateCommentTree(current, {
          ...commentDeleting,
          author: null,
          content: null,
          isDeleted: true,
          editedAt: null,
        }),
      );
      setCommentDeleting(null);
      setPost((current) =>
        current
          ? {
              ...current,
              commentCount: Math.max(0, (current.commentCount ?? 1) - 1),
            }
          : current,
      );
    } catch {
      setCommentFormError('Không thể xóa bình luận.');
    } finally {
      setCommentSubmitting(false);
    }
  }, [api, commentDeleting]);

  const handlePostSave = useCallback(async () => {
    if (!post) return;
    const content = editPostDraft.trim();
    if (!content) {
      setPostActionError('Nội dung bài viết không được để trống.');
      return;
    }
    setPostSaving(true);
    setPostActionError(null);
    const input: CommunityPostUpdateInput = {
      postType: post.postType,
      languageCode: post.targetLanguage.code,
      content,
      cefrLevel: post.cefrLevel,
      topic: post.topic,
      visibility: post.visibility,
    };
    try {
      const updated = await api.updatePost(post.id, input);
      setPost(updated);
      setEditingPost(false);
    } catch {
      setPostActionError('Không thể cập nhật bài viết.');
    } finally {
      setPostSaving(false);
    }
  }, [api, editPostDraft, post]);

  const handlePostDelete = useCallback(async () => {
    if (!post) return;
    setPostDeleting(true);
    setPostActionError(null);
    try {
      await api.deletePost(post.id);
      setPost(null);
      setPostError({
        message: 'Bài viết không khả dụng',
        unavailable: true,
      });
      setPostDeleteFocusPending(true);
    } catch {
      setPostActionError('Không thể xóa bài viết.');
    } finally {
      setPostDeleting(false);
    }
  }, [api, post]);

  const handleReportSubmit = useCallback(async () => {
    if (!reportTarget) return;
    const validation = validateReportInput({
      category: reportCategory,
      details: reportReason,
    });
    if (validation.category) {
      setReportError(validation.category);
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      if (reportTarget.type === 'POST') {
        await api.reportPost(reportTarget.id, {
          category: reportCategory as CommunityReportCategory,
          ...(reportReason.trim() ? { details: reportReason.trim() } : {}),
        });
      } else {
        await api.reportComment(reportTarget.id, {
          category: reportCategory as CommunityReportCategory,
          ...(reportReason.trim() ? { details: reportReason.trim() } : {}),
        });
      }
      setReportTarget(null);
      setReportCategory('');
      setReportReason('');
    } catch {
      setReportError('Không thể gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setReportSubmitting(false);
    }
  }, [api, reportCategory, reportReason, reportTarget]);

  const renderCommentComposer = useCallback((inline = false) => (
    <form
      className={inline ? 'community-detail__comment-form community-detail__comment-form--inline' : 'community-detail__comment-form'}
      onSubmit={handleCommentSubmit}
    >
      {inline ? (
        <div className="community-detail__reply-context">
          <span>Đang trả lời {getAuthorName(replyTo as CommunityComment)}</span>
          <button type="button" onClick={() => setReplyTo(null)}>
            Hủy
          </button>
        </div>
      ) : null}
      <label htmlFor="community-comment-input">Chia sẻ suy nghĩ của bạn</label>
      <textarea
        id="community-comment-input"
        value={commentDraft}
        onChange={(event) => {
          setCommentDraft(event.target.value);
          if (commentFormError) setCommentFormError(null);
        }}
        maxLength={MAX_COMMENT_CODE_POINTS}
        rows={inline ? 3 : 4}
        placeholder={authenticated ? 'Viết bình luận bằng văn bản thuần…' : 'Đăng nhập để tham gia thảo luận'}
        disabled={commentSubmitting}
      />
      <div className="community-detail__form-footer">
        <span>{Array.from(commentDraft).length}/{MAX_COMMENT_CODE_POINTS}</span>
        <button type="submit" disabled={commentSubmitting}>
          {commentSubmitting ? 'Đang gửi…' : inline ? 'Gửi phản hồi' : 'Gửi bình luận'}
        </button>
      </div>
      {commentFormError ? <p role="alert">{commentFormError}</p> : null}
    </form>
  ), [authenticated, commentDraft, commentFormError, commentSubmitting, handleCommentSubmit, replyTo]);

  const renderComment = useCallback(
    (comment: CommunityComment, nested = false) => {
      const thread = getThread(comment);
      const owner = isOwnerComment(comment, currentUserId);
      return (
        <article
          className={nested ? 'community-detail__comment community-detail__comment--reply' : 'community-detail__comment'}
          key={comment.id}
          aria-label={comment.isDeleted ? 'Bình luận đã bị xóa' : `Bình luận của ${getAuthorName(comment)}`}
        >
          {!comment.isDeleted ? (
            <div className="community-detail__comment-meta">
              <strong>{getAuthorName(comment)}</strong>
              {comment.editedAt ? <span>Đã chỉnh sửa</span> : null}
              {comment.createdAt ? <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time> : null}
            </div>
          ) : null}
          {comment.isDeleted ? (
            <div className="community-detail__deleted" role="note">
              <strong>Bình luận đã bị xóa</strong>
              <span>Các phản hồi bên dưới vẫn được duy trì để bảo toàn mạch thảo luận.</span>
            </div>
          ) : (
            <p>{commentText(comment)}</p>
          )}
          {!comment.isDeleted ? (
            <div className="community-detail__comment-actions">
              {!nested ? (
                <button type="button" onClick={() => { setReplyTo(comment); setCommentMenuOpen(null); }}>
                  Trả lời
                </button>
              ) : null}
              <button
                type="button"
                className="community-detail__comment-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={commentMenuOpen === comment.id}
                aria-controls={`community-comment-menu-${comment.id}`}
                aria-label={`Tùy chọn bình luận của ${getAuthorName(comment)}`}
                ref={commentMenuTriggerRef}
                onClick={(event) => {
                  commentMenuTriggerRef.current = event.currentTarget;
                  setCommentMenuOpen((current) => current === comment.id ? null : comment.id);
                }}
              >
                <Icon name="more-horizontal" size={18} />
              </button>
              {commentMenuOpen === comment.id ? (
                <div className="community-detail__comment-menu" id={`community-comment-menu-${comment.id}`} role="menu">
                  {owner ? (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setCommentMenuOpen(null);
                          setEditingComment(comment);
                          setEditCommentDraft(comment.content ?? '');
                          setCommentFormError(null);
                        }}
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setCommentMenuOpen(null);
                          setCommentDeleting(comment);
                        }}
                      >
                        Xóa
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCommentMenuOpen(null);
                        if (!authenticated) {
                          handleRequireAuth();
                          return;
                        }
                        setReportTarget({ type: 'COMMENT', id: comment.id });
                        setReportError(null);
                      }}
                    >
                      Báo cáo
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          {!nested && replyTo?.id === comment.id ? renderCommentComposer(true) : null}
          {thread.replies?.length ? (
            <div className="community-detail__replies">
              {thread.replies.map((reply) => renderComment(reply, true))}
            </div>
          ) : null}
          {thread.hasMoreReplies ? (
            <p className="community-detail__more-replies">
              Có thêm phản hồi trong chuỗi này.
            </p>
          ) : null}
        </article>
      );
    },
    [authenticated, commentMenuOpen, currentUserId, handleRequireAuth, renderCommentComposer, replyTo],
  );

  const postMeta = useMemo(() => {
    if (!post) return [];
    return [
      post.targetLanguage ? `Ngôn ngữ: ${post.targetLanguage.nativeName}` : null,
      post.cefrLevel ? `CEFR ${post.cefrLevel}` : null,
      post.topic ? `Chủ đề: ${post.topic}` : null,
    ].filter(Boolean) as string[];
  }, [post]);

  if (postLoading) {
    return (
      <main className="community-detail community-detail--loading" aria-busy="true">
        <div className="community-detail__skeleton" />
        <div className="community-detail__skeleton community-detail__skeleton--large" />
      </main>
    );
  }

  if (postError || !post) {
    return (
      <main className="community-detail community-detail--state">
        <section className="community-detail__state" role={postError?.unavailable ? undefined : 'alert'}>
          <p className="community-detail__eyebrow">Cộng đồng</p>
          <h1 ref={postStateHeadingRef} tabIndex={-1}>{postError?.message ?? 'Bài viết không khả dụng'}</h1>
          <p>
            {postError?.unavailable
              ? 'Nội dung có thể đã bị xóa, ẩn hoặc đang được kiểm duyệt.'
              : 'Vui lòng thử tải lại trang sau ít phút.'}
          </p>
          {!postError?.unavailable ? (
            <button type="button" onClick={() => void loadPost()}>
              Thử lại
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="community-detail">
      <header className="community-detail__mobile-header">
        <button
          type="button"
          className="community-detail__mobile-back"
          onClick={() => navigate('/community')}
          aria-label="Quay lại danh sách bài thảo luận"
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className="community-detail__mobile-header-copy">
          <span>Cộng đồng</span>
          <strong>Bài viết cộng đồng</strong>
        </div>
        <div className="community-detail__mobile-actions" aria-label="Thao tác bài viết">
          <button
            type="button"
            className="community-detail__mobile-icon-action"
            onClick={() => void handlePostAction('save')}
            disabled={actionPending !== null}
            aria-label="Lưu bài viết"
          >
            <Icon name="bookmark" size={18} />
          </button>
          {post.isShareable ? (
            <button
              type="button"
              className="community-detail__mobile-icon-action"
              onClick={() => void handlePostAction('share')}
              disabled={actionPending !== null}
              aria-label="Chia sẻ bài viết"
            >
              <Icon name="share" size={18} />
            </button>
          ) : null}
        </div>
      </header>
      <nav className="community-detail__breadcrumbs" aria-label="Điều hướng">
        <span>Trang chủ</span>
        <span aria-hidden="true">/</span>
        <span>Cộng đồng</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Bài viết</span>
      </nav>

      <div className="community-detail__layout">
        <div className="community-detail__primary">
          <article className="community-detail__post" aria-labelledby="community-detail-title">
            <header className="community-detail__post-header">
              <div className="community-detail__post-topline">
                <div className="community-detail__meta" aria-label="Thông tin bài viết">
                  {postMeta.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="community-detail__post-header-actions" aria-label="Thao tác bài viết">
                  <button
                    type="button"
                    className="community-detail__icon-action"
                    onClick={() => void handlePostAction('save')}
                    disabled={actionPending !== null}
                    aria-label={post.isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                  >
                    <Icon name="bookmark" size={18} />
                  </button>
                  {post.isShareable ? (
                    <button
                      type="button"
                      className="community-detail__icon-action"
                      onClick={() => void handlePostAction('share')}
                      disabled={actionPending !== null}
                      aria-label="Chia sẻ"
                    >
                      <Icon name="share" size={18} />
                    </button>
                  ) : null}
                  <div className="community-detail__post-menu">
                    <button
                      type="button"
                      className="community-detail__icon-action"
                      aria-haspopup="menu"
                      aria-expanded={postMenuOpen}
                      aria-controls="community-detail-post-menu"
                      aria-label="Tùy chọn bài viết"
                       ref={postMenuTriggerRef}
                       onClick={() => setPostMenuOpen((current) => !current)}
                    >
                      <Icon name="more-horizontal" size={18} />
                    </button>
                    {postMenuOpen ? (
                      <div className="community-detail__post-menu-list" id="community-detail-post-menu" role="menu">
                        {post.isOwner ? (
                          <>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setPostMenuOpen(false);
                                setEditingPost(true);
                                setEditPostDraft(post.content);
                                setPostActionError(null);
                              }}
                            >
                              Chỉnh sửa bài viết
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setPostMenuOpen(false);
                                setConfirmPostDelete(true);
                              }}
                              disabled={postDeleting}
                            >
                              {postDeleting ? 'Đang xóa…' : 'Xóa bài viết'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setPostMenuOpen(false);
                              if (!authenticated) {
                                handleRequireAuth();
                                return;
                              }
                              setReportTarget({ type: 'POST', id: post.id });
                              setReportError(null);
                            }}
                          >
                            Báo cáo vi phạm
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="community-detail__eyebrow">{post.postType}</p>
              <h1 id="community-detail-title">Bài viết cộng đồng</h1>
              <div className="community-detail__author">
                <span className="community-detail__avatar" aria-hidden="true">
                  {post.author.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{post.author.displayName}</strong>
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </div>
              </div>
            </header>

            <p className="community-detail__content">{post.content}</p>

            <div className="community-detail__post-actions" aria-label="Thao tác bài viết">
              <button
                type="button"
                onClick={() => void handlePostAction('helpful')}
                disabled={actionPending !== null}
              >
                Hữu ích{post.helpfulCount ? ` · ${post.helpfulCount}` : ''}
              </button>
              <span className="community-detail__comment-count" aria-label={`${post.commentCount ?? comments.length} bình luận`}>
                {post.commentCount ?? comments.length} bình luận
              </span>
            </div>
            {postActionError ? <p role="alert">{postActionError}</p> : null}
            {shareMessage ? (
              <p role="status">
                {shareMessage}{' '}
                {shareHref ? <a href={shareHref}>Mở liên kết chia sẻ</a> : null}
              </p>
            ) : null}
          </article>

          <section className="community-detail__comments" aria-labelledby="comments-title">
            <div className="community-detail__section-heading">
              <div>
                <p className="community-detail__eyebrow">Thảo luận</p>
                <h2 id="comments-title" ref={commentsHeadingRef} tabIndex={-1}>Thảo luận &amp; Đóng góp tri thức</h2>
              </div>
              <span>{post.commentCount ?? comments.length}</span>
            </div>

            {!replyTo ? renderCommentComposer() : null}

            {commentsLoading ? (
              <p className="community-detail__muted" aria-live="polite">Đang tải bình luận…</p>
            ) : commentsError ? (
              <div className="community-detail__inline-error" role="alert">
                <p>{commentsError}</p>
                <button type="button" onClick={() => void loadComments()}>
                  Thử lại
                </button>
              </div>
            ) : comments.length ? (
              <div className="community-detail__comment-list">
                {comments.map((comment) => renderComment(comment))}
                {nextCursor ? (
                  <button
                    className="community-detail__load-more"
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Đang tải…' : 'Xem thêm bình luận'}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="community-detail__muted">Chưa có bình luận. Hãy mở đầu cuộc trò chuyện.</p>
            )}
          </section>
        </div>

        <aside className="community-detail__rail" aria-label="Thông tin học tập">
          <section className="community-detail__rail-card community-detail__rail-card--context">
            <p className="community-detail__eyebrow">Ngữ cảnh học tập</p>
            <h2>Đọc kỹ, hỏi rõ, cùng tiến bộ.</h2>
            <p>
              Giữ thảo luận ở một cấp phản hồi để mọi người dễ theo dõi. Chia sẻ
              ví dụ văn bản thuần và tôn trọng người học khác.
            </p>
          </section>
          <section className="community-detail__rail-card community-detail__rail-card--metadata">
            <p className="community-detail__rail-label">Thông tin bài viết</p>
            <dl>
              <div><dt>Ngôn ngữ</dt><dd>{post.targetLanguage.nativeName}</dd></div>
              {post.cefrLevel ? <div><dt>Trình độ</dt><dd>CEFR {post.cefrLevel}</dd></div> : null}
              {post.topic ? <div><dt>Chủ đề</dt><dd>{post.topic}</dd></div> : null}
              <div><dt>Loại bài</dt><dd>{post.postType}</dd></div>
            </dl>
          </section>
          <details className="community-detail__rail-card community-detail__rail-card--guidelines" open>
            <summary>
              <span className="community-detail__rail-label">Nguyên tắc trao đổi</span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <ul>
              <li>Tôn trọng ngữ cảnh bản xứ.</li>
              <li>Dẫn chứng rõ ràng, cụ thể.</li>
              <li>Khích lệ người học cùng tiến bộ.</li>
            </ul>
          </details>
          <section className="community-detail__rail-card community-detail__rail-card--discussion">
            <p className="community-detail__rail-label">Mạch thảo luận</p>
            <p>Phản hồi được giữ ở một cấp để câu hỏi, dẫn chứng và câu trả lời luôn dễ theo dõi.</p>
          </section>
        </aside>
      </div>

      <Dialog
        open={editingPost}
        title='Chỉnh sửa bài viết'
        description='Chỉ có thể cập nhật nội dung và thông tin hiện có của bài viết.'
        onClose={() => setEditingPost(false)}
        returnFocusRef={postMenuTriggerRef}
      >
            <label htmlFor="community-edit-post">Nội dung</label>
            <textarea
              id="community-edit-post"
              value={editPostDraft}
              onChange={(event) => setEditPostDraft(event.target.value)}
              rows={8}
              maxLength={50000}
            />
            {postActionError ? <p role="alert">{postActionError}</p> : null}
            <div className="community-detail__modal-actions">
              <button type="button" onClick={() => setEditingPost(false)}>
                Hủy
              </button>
              <button type="button" onClick={() => void handlePostSave()} disabled={postSaving}>
                {postSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={Boolean(editingComment)}
        title='Chỉnh sửa bình luận'
        description='Giữ nguyên ý nghĩa của bình luận khi cập nhật văn bản.'
        onClose={() => setEditingComment(null)}
        returnFocusRef={commentMenuTriggerRef}
      >
            <label htmlFor="community-edit-comment">Nội dung</label>
            <textarea
              id="community-edit-comment"
              value={editCommentDraft}
              onChange={(event) => setEditCommentDraft(event.target.value)}
              rows={5}
              maxLength={MAX_COMMENT_CODE_POINTS}
            />
            {commentFormError ? <p role="alert">{commentFormError}</p> : null}
            <div className="community-detail__modal-actions">
              <button type="button" onClick={() => setEditingComment(null)}>
                Hủy
              </button>
              <button type="button" onClick={() => void handleCommentUpdate()} disabled={commentSubmitting}>
                {commentSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={Boolean(commentDeleting)}
        title='Xóa bình luận?'
        description='Bình luận sẽ được thay bằng trạng thái đã xóa và các phản hồi vẫn được giữ lại.'
        onClose={() => setCommentDeleting(null)}
        returnFocusRef={commentsHeadingRef}
      >
            <p>Bình luận sẽ được thay bằng trạng thái đã xóa và các phản hồi vẫn được giữ lại.</p>
            {commentFormError ? <p role="alert">{commentFormError}</p> : null}
            <div className="community-detail__modal-actions">
              <button type="button" onClick={() => setCommentDeleting(null)}>
                Hủy
              </button>
              <button type="button" onClick={() => void handleCommentDelete()} disabled={commentSubmitting}>
                {commentSubmitting ? 'Đang xóa…' : 'Xóa bình luận'}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={confirmPostDelete}
        title='Xóa bài viết?'
        description='Bài viết sẽ không còn hiển thị công khai và không thể khôi phục từ trang này.'
        onClose={() => setConfirmPostDelete(false)}
        returnFocusRef={postMenuTriggerRef}
      >
            <p>Bài viết sẽ không còn hiển thị công khai và không thể khôi phục từ trang này.</p>
            <div className="community-detail__modal-actions">
              <button type="button" onClick={() => setConfirmPostDelete(false)}>
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handlePostDelete()}
                disabled={postDeleting}
              >
                {postDeleting ? 'Đang xóa…' : 'Xóa bài viết'}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={Boolean(reportTarget)}
        title='Báo cáo nội dung'
        description='Chỉ gửi báo cáo khi nội dung vi phạm quy tắc cộng đồng.'
        onClose={() => {
          setReportTarget(null);
          setReportCategory('');
          setReportReason('');
        }}
        returnFocusRef={reportTarget?.type === 'COMMENT' ? commentMenuTriggerRef : postMenuTriggerRef}
      >
            <label htmlFor="community-report-category">Danh mục</label>
            <select
              id="community-report-category"
              value={reportCategory}
              onChange={(event) => {
                setReportCategory(event.target.value);
                setReportError(null);
              }}
            >
              <option value="">Chọn lý do</option>
              {COMMUNITY_REPORT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {COMMUNITY_REPORT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            <label htmlFor="community-report-reason">Lý do</label>
            <textarea
              id="community-report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              rows={5}
              maxLength={1000}
            />
            {reportError ? <p role="alert">{reportError}</p> : null}
            <div className="community-detail__modal-actions">
              <button
                type="button"
                onClick={() => {
                  setReportTarget(null);
                  setReportCategory('');
                  setReportReason('');
                }}
              >
                Hủy
              </button>
              <button type="button" onClick={() => void handleReportSubmit()} disabled={reportSubmitting}>
                {reportSubmitting ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </div>
      </Dialog>
    </main>
  );
}

export function CommunityPostDetailPage({
  api = communityApi,
}: {
  api?: CommunityPostDetailApi;
}) {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const { postId = '' } = useParams<{ postId: string }>();

  if (!postId) {
    return (
      <main className="community-detail community-detail--state">
        <section className="community-detail__state" role="alert">
          <h1>Bài viết không khả dụng</h1>
          <p>Đường dẫn bài viết không hợp lệ.</p>
        </section>
      </main>
    );
  }

  return (
    <CommunityPostDetailPageView
      api={api}
      postId={postId}
      authenticated={status === 'authenticated'}
      currentUserId={user?.id}
      onAuthRequired={() =>
        navigate('/login', { state: { from: `/community/posts/${postId}` } })
      }
    />
  );
}
