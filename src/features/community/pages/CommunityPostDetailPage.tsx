import { CommunityDisclosure } from '../components/CommunityDisclosure';
import { CorrectionRequestOriginal } from '../components/CorrectionRequestOriginal';
import { useCorrectionRequestSource } from '../hooks/useCorrectionRequestSource';
import type { TranslationKey } from '../../ui-locale/ui-locale';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { GeneralDiscussion } from '../components/GeneralDiscussion';
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
import { correctionsApi } from '../api/corrections-api';
import type { CommunityComposerApiPort } from '../components/CommunityComposer';
import type { CommunityPostActionsApi } from '../components/CommunityPostCard';
import { ShareContextButton } from '../../exchange/components/ShareContextButton';
import { StructuredResponseExperience } from '../components/StructuredResponseExperience';
import './CommunityPostDetailPage.css';
import presentation from '../components/CommunityDetailPresentation.module.css';
import { CommunityPostTypeBadge } from '../components/CommunityPostTypeBadge';
import { CommunityActionButton } from '../components/CommunityActionButton';
import { getCommunityCapabilities } from '../community-capabilities';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import type { CommunityRequestApi, CommunityStructuredResponseApi } from '../corrections.types';
import { COMMUNITY_REPORT_CATEGORIES, COMMUNITY_REPORT_CATEGORY_LABELS_KEYS, COMMUNITY_POST_TYPE_LABELS_KEYS } from '../community.constants';
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
  structuredApi?: CommunityStructuredResponseApi;
  requestApi?: Pick<CommunityRequestApi, 'getCorrectionRequest'>;
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
  message: TranslationKey;
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


function getThread(comment: CommunityComment): CommunityCommentThread {
  return comment as CommunityCommentThread;
}

function getAuthorName(comment: CommunityComment, t: ReturnType<typeof useUiLocale>['t']): string {
  return comment.author?.displayName ?? t('community.detail.anonymous.member');
}

function isOwnerComment(
  comment: CommunityComment,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(
    currentUserId && comment.author?.id && comment.author.id === currentUserId,
  );
}

function commentText(comment: CommunityComment, t: ReturnType<typeof useUiLocale>['t']): string {
  if (comment.isDeleted) return t('community.detail.comment.deleted');
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
  structuredApi = correctionsApi,
  requestApi = correctionsApi,
  postId,
  authenticated = false,
  currentUserId,
  onAuthRequired,
}: CommunityPostDetailPageViewProps) {
  const navigate = useNavigate();
  const { t, locale, formatDate: formatLocaleDate } = useUiLocale();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState<DetailError | null>(null);
  const [comments, setComments] = useState<CommunityCommentThread[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<TranslationKey | null>(null);
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

  const correctionSource = useCorrectionRequestSource(post, requestApi, authenticated, currentUserId);

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
          ? 'community.detail.post.unavailable'
          : 'community.detail.could.not.load.the.post',
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
      setCommentsError('community.detail.could.not.load.comments');
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
      setCommentsError('community.detail.could.not.load.more.comments');
    } finally {
      setLoadingMore(false);
    }
  }, [api, authenticated, loadingMore, nextCursor, postId, t, locale]);

  const handleRequireAuth = useCallback(() => {
    onAuthRequired?.();
  }, [onAuthRequired, t, locale]);

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
          setShareMessage(t('community.detail.the.shared.link.is.ready'));
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(
                new URL(response.canonicalPath, window.location.origin).toString(),
              );
              setShareMessage(t('community.detail.the.shared.link.is.ready'));
            } catch {
              // The link remains available when clipboard permission is denied.
            }
          }
        }
      } catch {
        setPostActionError(t('community.detail.the.action.could.not.be.completed.please.try.again.shortly'));
      } finally {
        setActionPending(null);
      }
    },
    [api, authenticated, handleRequireAuth, post, t, locale],
  );

  const handleCommentSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!post) return;
      if (!authenticated) {
        handleRequireAuth();
        return;
      }

      const validation = validateCommentInput({ content: commentDraft }, locale);
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
        setCommentFormError(t('community.detail.could.not.send.the.comment.your.draft.is.preserved.so'));
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
      t,
      locale,
    ],
  );

  const handleCommentUpdate = useCallback(async () => {
    if (!editingComment) return;
    const validation = validateCommentInput({ content: editCommentDraft }, locale);
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
      setCommentFormError(t('community.detail.could.not.update.the.comment'));
    } finally {
      setCommentSubmitting(false);
    }
  }, [api, editCommentDraft, editingComment, t, locale]);

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
      setCommentFormError(t('community.detail.could.not.delete.the.comment'));
    } finally {
      setCommentSubmitting(false);
    }
  }, [api, commentDeleting, t, locale]);

  const handlePostSave = useCallback(async () => {
    if (!post) return;
    const content = editPostDraft.trim();
    if (!content) {
      setPostActionError(t('community.detail.post.content.cannot.be.empty'));
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
      setPostActionError(t('community.detail.could.not.update.the.post'));
    } finally {
      setPostSaving(false);
    }
  }, [api, editPostDraft, post, t, locale]);

  const handlePostDelete = useCallback(async () => {
    if (!post) return;
    setPostDeleting(true);
    setPostActionError(null);
    try {
      await api.deletePost(post.id);
      setPost(null);
      setPostError({
        message: 'community.detail.post.unavailable',
        unavailable: true,
      });
      setPostDeleteFocusPending(true);
    } catch {
      setPostActionError(t('community.detail.could.not.delete.the.post'));
    } finally {
      setPostDeleting(false);
    }
  }, [api, post, t, locale]);

  const handleReportSubmit = useCallback(async () => {
    if (!reportTarget) return;
    const validation = validateReportInput({
      category: reportCategory,
      details: reportReason,
    }, locale);
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
      setReportError(t('community.detail.could.not.send.the.report.please.try.again'));
    } finally {
      setReportSubmitting(false);
    }
  }, [api, reportCategory, reportReason, reportTarget, t, locale]);

  const renderCommentComposer = useCallback((inline = false) => (
    <form
      className={inline ? 'community-detail__comment-form community-detail__comment-form--inline' : 'community-detail__comment-form'}
      onSubmit={handleCommentSubmit}
    >
      {inline ? (
        <div className="community-detail__reply-context">
          <span>{t('community.detail.replying.to')}{getAuthorName(replyTo as CommunityComment, t)}</span>
          <button type="button" onClick={() => setReplyTo(null)}>
            {t('community.detail.cancel')}</button>
        </div>
      ) : null}
      <label htmlFor="community-comment-input">{t('community.detail.share.your.thoughts')}</label>
      <textarea
        id="community-comment-input"
        value={commentDraft}
        onChange={(event) => {
          setCommentDraft(event.target.value);
          if (commentFormError) setCommentFormError(null);
        }}
        maxLength={MAX_COMMENT_CODE_POINTS}
        rows={inline ? 3 : 4}
        placeholder={authenticated ? t('community.detail.write.a.plain.text.comment') : t('community.detail.sign.in.to.join.the.discussion')}
        disabled={commentSubmitting}
      />
      <div className="community-detail__form-footer">
        <span>{Array.from(commentDraft).length}/{MAX_COMMENT_CODE_POINTS}</span>
        <button type="submit" disabled={commentSubmitting}>
          {commentSubmitting ? t('community.detail.sending') : inline ? t('community.detail.send.reply') : t('community.detail.send.comment')}
        </button>
      </div>
      {commentFormError ? <p role="alert">{commentFormError}</p> : null}
    </form>
  ), [authenticated, commentDraft, commentFormError, commentSubmitting, handleCommentSubmit, replyTo, t, locale]);

  const renderComment = useCallback(
    (comment: CommunityComment, nested = false) => {
      const thread = getThread(comment);
      const owner = isOwnerComment(comment, currentUserId);
      return (
        <article
          className={nested ? 'community-detail__comment community-detail__comment--reply' : 'community-detail__comment'}
          key={comment.id}
          aria-label={comment.isDeleted ? t('community.detail.comment.deleted') : t('community.detail.commentBy', {name: getAuthorName(comment, t)})}
        >
          {!comment.isDeleted ? (
            <div className="community-detail__comment-meta">
              <strong>{getAuthorName(comment, t)}</strong>
              {comment.editedAt ? <span>{t('community.detail.edited')}</span> : null}
              {comment.createdAt ? <time dateTime={comment.createdAt}>{formatLocaleDate(comment.createdAt, {dateStyle: 'medium', timeStyle: 'short'})}</time> : null}
            </div>
          ) : null}
          {comment.isDeleted ? (
            <div className="community-detail__deleted" role="note">
              <strong>{t('community.detail.comment.deleted')}</strong>
              <span>{t('community.detail.replies.below.are.kept.to.preserve.the.discussion')}</span>
            </div>
          ) : (
            <p>{commentText(comment, t)}</p>
          )}
          {!comment.isDeleted ? (
            <div className="community-detail__comment-actions">
              {!nested ? (
                <button type="button" onClick={() => { setReplyTo(comment); setCommentMenuOpen(null); }}>
                  {t('community.detail.reply')}</button>
              ) : null}
              <button
                type="button"
                className="community-detail__comment-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={commentMenuOpen === comment.id}
                aria-controls={`community-comment-menu-${comment.id}`}
                aria-label={t('community.detail.commentOptions', {name: getAuthorName(comment, t)})}
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
                        {t('community.detail.edit')}</button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setCommentMenuOpen(null);
                          setCommentDeleting(comment);
                        }}
                      >
                        {t('community.detail.delete')}</button>
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
                      {t('community.detail.report')}</button>
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
              {t('community.detail.there.are.more.replies.in.this.thread')}</p>
          ) : null}
        </article>
      );
    },
    [authenticated, commentMenuOpen, currentUserId, handleRequireAuth, renderCommentComposer, replyTo, t, locale],
  );

  const postMeta = useMemo(() => {
    if (!post) return [];
    return [
      post.targetLanguage ? t('community.detail.languageValue', {name: post.targetLanguage.nativeName}) : null,
      post.cefrLevel ? `CEFR ${post.cefrLevel}` : null,
      post.topic ? t('community.detail.topicValue', {topic: post.topic}) : null,
    ].filter(Boolean) as string[];
  }, [post, t]);

  const unsupportedPost = post !== null && !getCommunityCapabilities(post, authenticated).supported;

  if (postLoading) {
    return (
      <div className="community-detail community-detail--loading" aria-busy="true">
        <div className="community-detail__skeleton" />
        <div className="community-detail__skeleton community-detail__skeleton--large" />
      </div>
    );
  }

  if (postError || !post || unsupportedPost) {
    return (
      <div className="community-detail community-detail--state">
        <section className="community-detail__state" role={postError?.unavailable || unsupportedPost ? undefined : 'alert'}>
          <p className="community-detail__eyebrow">{t('community.detail.community')}</p>
          <h1 ref={postStateHeadingRef} tabIndex={-1}>{t(postError?.message ?? 'community.detail.post.unavailable')}</h1>
          <p>
            {postError?.unavailable
              ? t('community.detail.the.content.may.have.been.deleted.hidden.or.placed.under')
              : t('community.detail.please.try.reloading.the.page.shortly')}
          </p>
          {!postError?.unavailable && !unsupportedPost ? (
            <button type="button" onClick={() => void loadPost()}>
              {t('community.detail.try.again')}</button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="community-detail">
      <header className="community-detail__mobile-header">
        <button
          type="button"
          className="community-detail__mobile-back"
          onClick={() => navigate('/community')}
          aria-label={t('community.detail.back.to.community.posts')}
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className="community-detail__mobile-header-copy">
          <span>{t('community.detail.community')}</span>
          <strong>{t('community.detail.community.post')}</strong>
        </div>
        <div className="community-detail__mobile-actions" aria-label={t('community.detail.post.actions')}>
          <button
            type="button"
            className="community-detail__mobile-icon-action"
            onClick={() => void handlePostAction('save')}
            aria-pressed={post.isSaved}
                    disabled={actionPending !== null}
            aria-label={t('community.detail.save.post')}
          >
            <Icon name="bookmark" size={18} />
          </button>
          {getCommunityCapabilities(post, authenticated).publicShare ? (
            <button
              type="button"
              className="community-detail__mobile-icon-action"
              onClick={() => void handlePostAction('share')}
              disabled={actionPending !== null}
              aria-label={t('community.detail.share.post')}
            >
              <Icon name="share" size={18} />
            </button>
          ) : null}
        </div>
      </header>
      <nav className="community-detail__breadcrumbs" aria-label={t('community.detail.navigation')}>
        <span>{t('community.detail.home')}</span>
        <span aria-hidden="true">/</span>
        <span>{t('community.detail.community')}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t('community.detail.post')}</span>
      </nav>

      <div className="community-detail__layout">
        <div className="community-detail__primary">
          <article className="community-detail__post" aria-labelledby="community-detail-title">
            <header className={presentation.header}>
              <div className="community-detail__post-topline">
                <div className="community-detail__meta" aria-label={t('community.detail.post.information')}>
                  {postMeta.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="community-detail__post-header-actions" aria-label={t('community.detail.post.actions')}>
                  <button
                    type="button"
                    className="community-detail__icon-action"
                    onClick={() => void handlePostAction('save')}
                    aria-pressed={post.isSaved}
                    disabled={actionPending !== null}
                    aria-label={post.isSaved ? t('community.detail.unsave.post') : t('community.detail.save.post')}
                  >
                    <Icon name="bookmark" size={18} />
                  </button>
                  {getCommunityCapabilities(post, authenticated).publicShare ? (
                    <button
                      type="button"
                      className="community-detail__icon-action"
                      onClick={() => void handlePostAction('share')}
                      disabled={actionPending !== null}
                      aria-label={t('community.detail.share')}
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
                      aria-label={t('community.detail.post.options')}
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
                              {t('community.detail.edit.post')}</button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setPostMenuOpen(false);
                                setConfirmPostDelete(true);
                              }}
                              disabled={postDeleting}
                            >
                              {postDeleting ? t('community.detail.deleting') : t('community.detail.delete.post')}
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
                            {t('community.detail.report.a.violation')}</button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <CommunityPostTypeBadge type={post.postType} />
              <h1 id="community-detail-title" className={presentation.identity}>{t('community.detail.identity', {type: t(COMMUNITY_POST_TYPE_LABELS_KEYS[post.postType]), name: post.author.displayName})}</h1>
              <div className="community-detail__author">
                <span className="community-detail__avatar" aria-hidden="true">
                  {post.author.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{post.author.displayName}</strong>
                  <time dateTime={post.createdAt}>{formatLocaleDate(post.createdAt, {dateStyle: 'medium', timeStyle: 'short'})}</time>
                </div>
              </div>
            </header>

            {post.postType === 'CORRECTION_REQUEST' ? <CorrectionRequestOriginal source={correctionSource} content={post.content} direction={post.targetLanguage.direction} /> : <p className={presentation.content} dir={post.targetLanguage.direction}>{post.content}</p>}

            <div className="community-detail__post-actions" aria-label={t('community.detail.post.actions')}>
              {getCommunityCapabilities(post, authenticated).partnerShare
                ? <ShareContextButton reference={{ type: 'COMMUNITY_POST', id: post.id }}/> : null}
              <CommunityActionButton onClick={() => void handlePostAction('helpful')} aria-pressed={post.viewerReacted} disabled={actionPending !== null}>
                <Icon name={post.viewerReacted ? 'check' : 'thumbs-up'} size={18} />
                <span>{t('community.detail.postHelpful')} · {post.helpfulCount}</span>
              </CommunityActionButton>
              <CommunityActionButton onClick={() => { if (!authenticated) { handleRequireAuth(); return; } setReportTarget({type: 'POST', id: post.id}); setReportError(null); }} aria-label={t('community.posts.report.post')}>
                <Icon name='flag' size={18} /><span>{t('community.posts.report')}</span>
              </CommunityActionButton>
              <span className="community-detail__comment-count" aria-label={t('community.detail.commentCount', { count: post.commentCount ?? comments.length })}>
                {t('community.detail.commentCount', {count: post.commentCount ?? comments.length})}
              </span>
            </div>
            {postActionError ? <p role="alert">{postActionError}</p> : null}
            {shareMessage ? (
              <p role="status">
                {shareMessage}{' '}
                {shareHref ? <Link to={shareHref}>{t('community.detail.open.shared.link')}</Link> : null}
              </p>
            ) : null}
          </article>

          {post.postType === 'CORRECTION_REQUEST' || post.postType === 'QUESTION' ? (
            <StructuredResponseExperience
              key={'structured:' + post.id + ':' + (authenticated ? currentUserId ?? 'member' : 'guest')}
              parent={post}
              authenticated={authenticated}
              api={structuredApi}
              requestApi={requestApi}
              correctionSource={post.postType === 'CORRECTION_REQUEST' ? correctionSource : undefined}
              onAuthRequired={handleRequireAuth}
            />
          ) : null}

          <GeneralDiscussion key={'discussion:' + post.id} secondary={getCommunityCapabilities(post, authenticated).secondaryDiscussion} count={post.commentCount ?? comments.length}>
          <section className="community-detail__comments" aria-labelledby="comments-title">
            <div className="community-detail__section-heading">
              <div>
                <p className="community-detail__eyebrow">{t('community.detail.discussion')}</p>
                <h2 id="comments-title" ref={commentsHeadingRef} tabIndex={-1}>{t('community.detail.discussion.and.contributions')}</h2>
              </div>
              <span>{post.commentCount ?? comments.length}</span>
            </div>

            {!replyTo ? renderCommentComposer() : null}

            {commentsLoading ? (
              <p className="community-detail__muted" aria-live="polite">{t('community.detail.loading.comments')}</p>
            ) : commentsError ? (
              <div className="community-detail__inline-error" role="alert">
                <p>{t(commentsError)}</p>
                <button type="button" onClick={() => void loadComments()}>
                  {t('community.detail.try.again')}</button>
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
                    {loadingMore ? t('community.detail.loading') : t('community.detail.load.more.comments')}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="community-detail__muted">{t('community.detail.no.comments.yet.start.the.conversation')}</p>
            )}
          </section>
          </GeneralDiscussion>
        </div>

        <aside className="community-detail__rail" aria-label={t('community.detail.learning.information')}>
          <section className="community-detail__rail-card community-detail__rail-card--metadata">
            <p className="community-detail__rail-label">{t('community.detail.post.information')}</p>
            <dl>
              <div><dt>{t('community.detail.language')}</dt><dd>{post.targetLanguage.nativeName}</dd></div>
              {post.cefrLevel ? <div><dt>{t('community.detail.level')}</dt><dd>CEFR {post.cefrLevel}</dd></div> : null}
              {post.topic ? <div><dt>{t('community.detail.topic')}</dt><dd>{post.topic}</dd></div> : null}
            </dl>
          </section>
          <CommunityDisclosure className="community-detail__rail-card community-detail__rail-card--guidelines" title={t('community.detail.discussion.guidelines')}>
            <ul>
              <li>{t('community.detail.respect.cultural.context')}</li>
              <li>{t('community.detail.use.clear.specific.examples')}</li>
              <li>{t('community.detail.encourage.fellow.learners')}</li>
            </ul>
          </CommunityDisclosure>
        </aside>
      </div>

      <Dialog
        open={editingPost}
        title={t('community.detail.edit.post')}
        description={t('community.detail.you.can.update.the.content.and.existing.post.information')}
        onClose={() => setEditingPost(false)}
        returnFocusRef={postMenuTriggerRef}
      >
            <label htmlFor="community-edit-post">{t('community.detail.content')}</label>
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
                {t('community.detail.cancel')}</button>
              <button type="button" onClick={() => void handlePostSave()} disabled={postSaving}>
                {postSaving ? t('community.detail.saving') : t('community.detail.save.changes')}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={Boolean(editingComment)}
        title={t('community.detail.edit.comment')}
        description={t('community.detail.preserve.the.meaning.of.your.comment.when.editing')}
        onClose={() => setEditingComment(null)}
        returnFocusRef={commentMenuTriggerRef}
      >
            <label htmlFor="community-edit-comment">{t('community.detail.content')}</label>
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
                {t('community.detail.cancel')}</button>
              <button type="button" onClick={() => void handleCommentUpdate()} disabled={commentSubmitting}>
                {commentSubmitting ? t('community.detail.saving') : t('community.detail.save.changes')}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={Boolean(commentDeleting)}
        title={t('community.detail.delete.comment')}
        description={t('community.detail.the.comment.will.be.replaced.with.a.deleted.state.and')}
        onClose={() => setCommentDeleting(null)}
        returnFocusRef={commentsHeadingRef}
      >
            <p>{t('community.detail.the.comment.will.be.replaced.with.a.deleted.state.and')}</p>
            {commentFormError ? <p role="alert">{commentFormError}</p> : null}
            <div className="community-detail__modal-actions">
              <button type="button" onClick={() => setCommentDeleting(null)}>
                {t('community.detail.cancel')}</button>
              <button type="button" onClick={() => void handleCommentDelete()} disabled={commentSubmitting}>
                {commentSubmitting ? t('community.detail.deleting') : t('community.detail.delete.comment.confirmation')}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={confirmPostDelete}
        title={t('community.detail.delete.post.confirmation')}
        description={t('community.detail.the.post.will.no.longer.be.public.and.cannot.be')}
        onClose={() => setConfirmPostDelete(false)}
        returnFocusRef={postMenuTriggerRef}
      >
            <p>{t('community.detail.the.post.will.no.longer.be.public.and.cannot.be')}</p>
            <div className="community-detail__modal-actions">
              <button type="button" onClick={() => setConfirmPostDelete(false)}>
                {t('community.detail.cancel')}</button>
              <button
                type="button"
                onClick={() => void handlePostDelete()}
                disabled={postDeleting}
              >
                {postDeleting ? t('community.detail.deleting') : t('community.detail.delete.post')}
              </button>
            </div>
      </Dialog>

      <Dialog
        open={Boolean(reportTarget)}
        title={t('community.detail.report.content')}
        description={t('community.detail.report.only.content.that.violates.community.rules')}
        onClose={() => {
          setReportTarget(null);
          setReportCategory('');
          setReportReason('');
        }}
        returnFocusRef={reportTarget?.type === 'COMMENT' ? commentMenuTriggerRef : postMenuTriggerRef}
      >
            <label htmlFor="community-report-category">{t('community.detail.category')}</label>
            <select
              id="community-report-category"
              value={reportCategory}
              onChange={(event) => {
                setReportCategory(event.target.value);
                setReportError(null);
              }}
            >
              <option value="">{t('community.detail.choose.a.reason')}</option>
              {COMMUNITY_REPORT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(COMMUNITY_REPORT_CATEGORY_LABELS_KEYS[category])}
                </option>
              ))}
            </select>
            <label htmlFor="community-report-reason">{t('community.detail.reason')}</label>
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
                {t('community.detail.cancel')}</button>
              <button type="button" onClick={() => void handleReportSubmit()} disabled={reportSubmitting}>
                {reportSubmitting ? t('community.detail.sending') : t('community.detail.send.report')}
              </button>
            </div>
      </Dialog>
    </div>
  );
}

export function CommunityPostDetailPage({
  api = communityApi,
  structuredApi = correctionsApi,
  requestApi = correctionsApi,
}: {
  api?: CommunityPostDetailApi;
  structuredApi?: CommunityStructuredResponseApi;
  requestApi?: Pick<CommunityRequestApi, 'getCorrectionRequest'>;
}) {
  const { t } = useUiLocale();
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const { postId = '' } = useParams<{ postId: string }>();

  if (!postId) {
    return (
      <div className="community-detail community-detail--state">
        <section className="community-detail__state" role="alert">
          <h1>{t('community.detail.post.unavailable')}</h1>
          <p>{t('community.detail.the.post.link.is.invalid')}</p>
        </section>
      </div>
    );
  }

  return (
    <CommunityPostDetailPageView
      api={api}
      structuredApi={structuredApi}
      requestApi={requestApi}
      postId={postId}
      authenticated={status === 'authenticated'}
      currentUserId={user?.id}
      onAuthRequired={() =>
        navigate('/login', { state: { from: `/community/posts/${postId}` } })
      }
    />
  );
}
