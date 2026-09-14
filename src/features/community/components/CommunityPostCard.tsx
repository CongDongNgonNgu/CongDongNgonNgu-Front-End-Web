import { useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Avatar, Badge, Card, LanguageIndicator } from '../../../components/ui/Surface';
import type {
  CommunityPost,
  CommunityReactionResponse,
  CommunitySaveResponse,
  CommunityShareResponse,
} from '../community.types';
import { COMMUNITY_POST_TYPE_LABELS } from '../community.constants';
import { CommunityReportDialog, type CommunityReportApiPort } from './CommunityReportDialog';
import styles from './CommunityPostCard.module.css';

export interface CommunityPostActionsApi extends CommunityReportApiPort {
  addHelpful: (postId: string) => Promise<CommunityReactionResponse>;
  removeHelpful: (postId: string) => Promise<CommunityReactionResponse>;
  savePost: (postId: string) => Promise<CommunitySaveResponse>;
  unsavePost: (postId: string) => Promise<CommunitySaveResponse>;
  getShareLink: (postId: string) => Promise<CommunityShareResponse>;
}

interface CommunityPostCardProps {
  post: CommunityPost;
  api: CommunityPostActionsApi;
  authenticated: boolean;
  onAuthRequired: () => void;
}

type PendingAction = 'helpful' | 'save' | 'share' | null;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Vừa đăng';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getActionError(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 429) {
    return 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }
  return 'Thao tác chưa hoàn tất. Vui lòng thử lại sau ít phút.';
}

export function CommunityPostCard({
  post,
  api,
  authenticated,
  onAuthRequired,
}: CommunityPostCardProps) {
  const [viewerReacted, setViewerReacted] = useState(post.viewerReacted);
  const [helpfulCount, setHelpfulCount] = useState(post.helpfulCount);
  const [saved, setSaved] = useState(post.isSaved);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareHref, setShareHref] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const requireAuth = () => {
    setActionError('');
    onAuthRequired();
  };

  const handleHelpful = async () => {
    if (!authenticated) {
      requireAuth();
      return;
    }
    setPendingAction('helpful');
    setActionError('');
    try {
      const response = viewerReacted
        ? await api.removeHelpful(post.id)
        : await api.addHelpful(post.id);
      setViewerReacted(response.reacted);
      setHelpfulCount(response.helpfulCount);
    } catch (error) {
      setActionError(getActionError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleSave = async () => {
    if (!authenticated) {
      requireAuth();
      return;
    }
    setPendingAction('save');
    setActionError('');
    try {
      const response = saved
        ? await api.unsavePost(post.id)
        : await api.savePost(post.id);
      setSaved(response.saved);
    } catch (error) {
      setActionError(getActionError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleShare = async () => {
    setPendingAction('share');
    setActionError('');
    setShareMessage('');
    setShareHref('');
    try {
      const response = await api.getShareLink(post.id);
      const canonicalPath = response.canonicalPath;
      if (
        !response.isShareable
        || !canonicalPath
        || !canonicalPath.startsWith('/')
        || canonicalPath.startsWith('//')
      ) {
        setActionError('Bài viết này chưa có liên kết chia sẻ.');
        return;
      }
      setShareHref(canonicalPath);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(new URL(canonicalPath, window.location.origin).toString());
          setShareMessage('Đã sao chép liên kết chia sẻ.');
        } catch {
          setShareMessage('Liên kết chia sẻ đã sẵn sàng.');
        }
      } else {
        setShareMessage('Liên kết chia sẻ đã sẵn sàng.');
      }
    } catch (error) {
      setActionError(getActionError(error));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      <Card className={styles.card}>
        <div className={styles.header}>
          <Avatar name={post.author.displayName} size='md' />
          <div className={styles.author}>
            <h2 className={styles.srOnly}>Bài viết của {post.author.displayName}</h2>
            <strong>{post.author.displayName}</strong>
            <div className={styles.meta}>
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
              {post.editedAt ? <span>· Đã chỉnh sửa</span> : null}
            </div>
          </div>
          <div className={styles.headerBadges}>
            <LanguageIndicator language={post.targetLanguage.nativeName} level={post.cefrLevel ?? undefined} />
            <Badge tone='neutral'>{COMMUNITY_POST_TYPE_LABELS[post.postType]}</Badge>
          </div>
        </div>

        {post.topic ? <p className={styles.topic}>#{post.topic}</p> : null}
        <p className={styles.content} dir={post.targetLanguage.direction}>{post.content}</p>
        <a
          className={styles.detailLink}
          href={`/community/posts/${encodeURIComponent(post.id)}`}
          aria-label={`Xem chi tiết bài viết của ${post.author.displayName}`}
        >
          Xem chi tiết bài viết
        </a>

        <div className={styles.footer}>
          <div className={styles.stats} aria-label='Thông tin tương tác'>
            <span>{helpfulCount} lượt hữu ích</span>
            <span>{post.commentCount} bình luận</span>
          </div>
          <div className={styles.actions} aria-label='Hành động bài viết'>
            <Button
              variant='quiet'
              size='sm'
              className={viewerReacted ? styles.actionActive : ''}
              onClick={() => void handleHelpful()}
              loading={pendingAction === 'helpful'}
              aria-pressed={viewerReacted}
              aria-label={viewerReacted ? 'Bỏ đánh dấu hữu ích' : 'Đánh dấu hữu ích'}
            >
              <Icon name='thumbs-up' size={16} />
              <span>Hữu ích</span>
            </Button>
            <Button
              variant='quiet'
              size='sm'
              className={saved ? styles.actionActive : ''}
              onClick={() => void handleSave()}
              loading={pendingAction === 'save'}
              aria-pressed={saved}
              aria-label={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
            >
              <Icon name='bookmark' size={16} />
              <span>Lưu</span>
            </Button>
            {post.isShareable ? (
              <Button
                variant='quiet'
                size='sm'
                onClick={() => void handleShare()}
                loading={pendingAction === 'share'}
                aria-label='Chia sẻ bài viết'
              >
                <Icon name='share' size={16} />
                <span>Chia sẻ</span>
              </Button>
            ) : null}
            <Button
              variant='quiet'
              size='sm'
              onClick={() => authenticated ? setReportOpen(true) : requireAuth()}
              aria-label='Báo cáo bài viết'
            >
              <Icon name='flag' size={16} />
              <span>Báo cáo</span>
            </Button>
          </div>
        </div>

        {actionError ? <p className={styles.actionError} role='alert'>{actionError}</p> : null}
        {shareMessage ? (
          <p className={styles.shareConfirmation} role='status'>
            {shareMessage}{' '}
            {shareHref ? <a href={shareHref}>Mở liên kết chia sẻ</a> : null}
          </p>
        ) : null}
      </Card>

      <CommunityReportDialog
        open={reportOpen}
        post={post}
        api={api}
        authenticated={authenticated}
        onAuthRequired={onAuthRequired}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
