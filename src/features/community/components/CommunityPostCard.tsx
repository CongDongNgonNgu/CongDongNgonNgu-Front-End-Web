import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { translate, type UiLocale, type TranslationKey } from '../../ui-locale/ui-locale';
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { COMMUNITY_POST_TYPE_LABELS_KEYS } from '../community.constants';
import { ShareContextButton } from '../../exchange/components/ShareContextButton';
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



function getActionError(error: unknown, locale: UiLocale = 'vi'): string {
  const t = (key: TranslationKey) => translate(locale, key);
  if (error instanceof ApiClientError && error.status === 429) {
    return t("community.posts.you.have.made.too.many.requests.please.try");
  }
  return t("community.posts.unable.to.complete.this.action.please.try.again");
}

export function CommunityPostCard({
  post,
  api,
  authenticated,
  onAuthRequired,
}: CommunityPostCardProps) {
  const { t, locale, formatNumber, formatDate } = useUiLocale();
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
      setActionError(getActionError(error, locale));
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
      setActionError(getActionError(error, locale));
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
        setActionError(t("community.posts.this.post.has.no.shareable.link"));
        return;
      }
      setShareHref(canonicalPath);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(new URL(canonicalPath, window.location.origin).toString());
          setShareMessage(t("community.posts.share.link.copied"));
        } catch {
          setShareMessage(t("community.posts.the.share.link.is.ready"));
        }
      } else {
        setShareMessage(t("community.posts.the.share.link.is.ready"));
      }
    } catch (error) {
      setActionError(getActionError(error, locale));
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
            <h2 className={styles.srOnly}>{t('community.posts.author', { name: post.author.displayName })}</h2>
            <strong>{post.author.displayName}</strong>
            <div className={styles.meta}>
              <time dateTime={post.createdAt}>{formatDate(post.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time>
              {post.editedAt ? <span>{t("community.posts.edited")}</span> : null}
            </div>
          </div>
          <div className={styles.headerBadges}>
            <LanguageIndicator language={post.targetLanguage.nativeName} level={post.cefrLevel ?? undefined} />
            <Badge tone='neutral'>{t(COMMUNITY_POST_TYPE_LABELS_KEYS[post.postType])}</Badge>
          </div>
        </div>

        {post.topic ? <p className={styles.topic}>#{post.topic}</p> : null}
        <p className={styles.content} dir={post.targetLanguage.direction}>{post.content}</p>
        <Link
          className={styles.detailLink}
          to={`/community/posts/${encodeURIComponent(post.id)}`}
          aria-label={t('community.posts.details.author', { name: post.author.displayName })}
        >
          {t("community.posts.view.post.details")}</Link>

        <div className={styles.footer}>
          <div className={styles.stats} aria-label={t("community.posts.post.interactions")}>
            <span>{formatNumber(helpfulCount)} {t("community.posts.helpful.votes")}</span>
            <span>{formatNumber(post.commentCount)} {t("community.posts.comments")}</span>
          </div>
          <div className={styles.actions} aria-label={t("community.posts.post.actions")}>
            {post.visibility === 'PUBLIC' && post.isShareable && ['DISCUSSION', 'QUESTION'].includes(post.postType)
              ? <ShareContextButton reference={{ type: 'COMMUNITY_POST', id: post.id }}/> : null}
            <Button
              variant='quiet'
              size='sm'
              className={viewerReacted ? styles.actionActive : ''}
              onClick={() => void handleHelpful()}
              loading={pendingAction === 'helpful'}
              aria-pressed={viewerReacted}
              aria-label={viewerReacted ? t("community.posts.remove.helpful.vote") : t("community.posts.mark.as.helpful")}
            >
              <Icon name='thumbs-up' size={16} />
              <span>{t("community.posts.helpful")}</span>
            </Button>
            <Button
              variant='quiet'
              size='sm'
              className={saved ? styles.actionActive : ''}
              onClick={() => void handleSave()}
              loading={pendingAction === 'save'}
              aria-pressed={saved}
              aria-label={saved ? t("community.posts.unsave.post") : t("community.posts.save.post")}
            >
              <Icon name='bookmark' size={16} />
              <span>{t("community.posts.save")}</span>
            </Button>
            {post.isShareable ? (
              <Button
                variant='quiet'
                size='sm'
                onClick={() => void handleShare()}
                loading={pendingAction === 'share'}
                aria-label={t("community.posts.share.a.post")}
              >
                <Icon name='share' size={16} />
                <span>{t("community.posts.share")}</span>
              </Button>
            ) : null}
            <Button
              variant='quiet'
              size='sm'
              onClick={() => authenticated ? setReportOpen(true) : requireAuth()}
              aria-label={t("community.posts.report.post")}
            >
              <Icon name='flag' size={16} />
              <span>{t("community.posts.report")}</span>
            </Button>
          </div>
        </div>

        {actionError ? <p className={styles.actionError} role='alert'>{actionError}</p> : null}
        {shareMessage ? (
          <p className={styles.shareConfirmation} role='status'>
            {shareMessage}{' '}
            {shareHref ? <Link to={shareHref}>{t("community.posts.open.share.link")}</Link> : null}
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
