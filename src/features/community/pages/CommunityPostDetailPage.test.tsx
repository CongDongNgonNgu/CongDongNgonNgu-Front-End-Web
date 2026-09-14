import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../../services/api-client';
import {
  CommunityPostDetailPageView,
  type CommunityPostDetailApi,
} from './CommunityPostDetailPage';
import type {
  CommunityComment,
  CommunityCommentListResponse,
  CommunityPost,
} from '../community.types';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function post(overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: 'post-1',
    author: {
      id: 'user-1',
      displayName: 'Nguyễn Minh',
    },
    targetLanguage: {
      code: 'ja',
      slug: 'japanese',
      nativeName: '日本語',
      englishName: 'Japanese',
      vietnameseName: 'Tiếng Nhật',
      direction: 'ltr',
    },
    postType: 'DISCUSSION',
    content:
      '<script>alert(1)</script>\n〜と考えられる và 〜と推測される.',
    cefrLevel: 'B1',
    topic: 'Ngữ pháp',
    visibility: 'PUBLIC',
    createdAt: '2026-09-14T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z',
    editedAt: null,
    canonicalPath: '/community/posts/post-1',
    isShareable: true,
    isOwner: false,
    helpfulCount: 4,
    viewerReacted: false,
    commentCount: 1,
    isSaved: false,
    ...overrides,
  };
}

function comment(overrides: Partial<CommunityComment> = {}): CommunityComment {
  return {
    id: 'comment-1',
    author: { id: 'user-2', displayName: 'Minh Hoàng' },
    parentCommentId: null,
    depth: 0,
    content: 'Mình cũng gặp mẫu câu này.',
    createdAt: '2026-09-14T08:10:00.000Z',
    updatedAt: '2026-09-14T08:10:00.000Z',
    editedAt: null,
    isDeleted: false,
    ...overrides,
  };
}

const comments: CommunityCommentListResponse = {
  items: [
    {
      ...comment(),
      replies: [],
      hasMoreReplies: false,
    },
  ],
  nextCursor: null,
};

function createApi(
  overrides: Partial<CommunityPostDetailApi> = {},
): CommunityPostDetailApi {
  return {
    getPost: vi.fn().mockResolvedValue(post()),
    listComments: vi.fn().mockResolvedValue(comments),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    addHelpful: vi.fn().mockResolvedValue({
      postId: 'post-1',
      type: 'HELPFUL',
      reacted: true,
      helpfulCount: 5,
    }),
    removeHelpful: vi.fn().mockResolvedValue({
      postId: 'post-1',
      type: 'HELPFUL',
      reacted: false,
      helpfulCount: 4,
    }),
    savePost: vi.fn().mockResolvedValue({ postId: 'post-1', saved: true }),
    unsavePost: vi.fn().mockResolvedValue({ postId: 'post-1', saved: false }),
    getShareLink: vi.fn().mockResolvedValue({
      postId: 'post-1',
      canonicalPath: '/community/posts/post-1',
      isShareable: true,
    }),
    reportPost: vi.fn().mockResolvedValue({ submitted: true }),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn().mockResolvedValue({ deleted: true }),
    reportComment: vi.fn().mockResolvedValue({ submitted: true }),
    ...overrides,
  };
}

function renderDetail(
  api: CommunityPostDetailApi,
  authenticated = false,
  currentUserId?: string,
) {
  return render(
    <MemoryRouter initialEntries={['/community/posts/post-1']}>
      <CommunityPostDetailPageView
        api={api}
        postId="post-1"
        authenticated={authenticated}
        currentUserId={currentUserId}
      />
    </MemoryRouter>,
  );
}

describe('CommunityPostDetailPageView', () => {
  it('loads a public post and comments as safe plain text', async () => {
    const api = createApi();

    renderDetail(api);

    expect(await screen.findByText('Minh Hoàng')).toBeInTheDocument();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.getPost).toHaveBeenCalledWith('post-1', false);
    expect(api.listComments).toHaveBeenCalledWith(
      'post-1',
      { limit: 20 },
      false,
    );
  });

  it('shows owner controls only for an owner post and uses the protected read', async () => {
    const api = createApi({
      getPost: vi.fn().mockResolvedValue(post({ isOwner: true })),
    });

    renderDetail(api, true);

    const menuTrigger = await screen.findByRole('button', { name: 'Tùy chọn bài viết' });
    fireEvent.click(menuTrigger);
    expect(screen.getByRole('menuitem', { name: 'Chỉnh sửa bài viết' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Xóa bài viết' })).toBeInTheDocument();
    expect(api.getPost).toHaveBeenCalledWith('post-1', true);
  });

  it('contains focus in the post edit dialog and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    const api = createApi({
      getPost: vi.fn().mockResolvedValue(post({ isOwner: true })),
    });

    renderDetail(api, true, 'user-1');

    const menuTrigger = await screen.findByRole('button', { name: 'Tùy chọn bài viết' });
    await user.click(menuTrigger);
    const trigger = screen.getByRole('menuitem', { name: 'Chỉnh sửa bài viết' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Chỉnh sửa bài viết' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])',
    ));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(menuTrigger).toHaveFocus();
  });

  it('moves focus to the surviving post state after deleting the post', async () => {
    const user = userEvent.setup();
    const api = createApi({
      getPost: vi.fn().mockResolvedValue(post({ isOwner: true })),
      deletePost: vi.fn().mockResolvedValue(undefined),
    });

    renderDetail(api, true, 'user-1');

    const menuTrigger = await screen.findByRole('button', { name: 'Tùy chọn bài viết' });
    await user.click(menuTrigger);
    await user.click(screen.getByRole('menuitem', { name: 'Xóa bài viết' }));
    await user.click(screen.getByRole('button', { name: 'Xóa bài viết' }));

    const stateHeading = await screen.findByRole('heading', { name: 'Bài viết không khả dụng' });
    expect(stateHeading).toHaveFocus();
  });

  it('uses dialog focus semantics for comment reports and restores the report trigger', async () => {
    const user = userEvent.setup();
    const api = createApi();

    renderDetail(api, true);

    const commentArticle = await screen.findByRole('article', {
      name: 'Bình luận của Minh Hoàng',
    });
    const menuTrigger = within(commentArticle).getByRole('button', { name: /Tùy chọn bình luận/ });
    await user.click(menuTrigger);
    const trigger = screen.getByRole('menuitem', { name: 'Báo cáo' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Báo cáo nội dung' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(menuTrigger).toHaveFocus();
  });

  it('keeps the post visible when comments fail independently', async () => {
    const api = createApi({
      listComments: vi.fn().mockRejectedValue(new Error('network')),
    });

    renderDetail(api);

    expect(await screen.findByText('Nguyễn Minh')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể tải bình luận',
    );
  });

  it('renders a moderated unavailable state for a missing post', async () => {
    const api = createApi({
      getPost: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError('missing', 404, 'COMMUNITY_POST_NOT_FOUND'),
        ),
    });

    renderDetail(api);

    expect(await screen.findByRole('heading', { name: 'Bài viết không khả dụng' }))
      .toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Minh')).not.toBeInTheDocument();
  });

  it('keeps deleted parents as placeholders while rendering one-level replies', async () => {
    const reply = comment({
      id: 'reply-1',
      parentCommentId: 'comment-1',
      depth: 1,
      author: { id: 'user-3', displayName: 'Lan Anh' },
      content: 'Mình dùng mẫu này trong phần viết.',
    });
    const api = createApi({
      listComments: vi.fn().mockResolvedValue({
        items: [
          {
            ...comment({ author: null, content: null, isDeleted: true }),
            replies: [reply],
            hasMoreReplies: false,
          },
        ],
        nextCursor: null,
      }),
    });

    renderDetail(api);

    expect(await screen.findByText('Bình luận đã bị xóa')).toBeInTheDocument();
    expect(screen.getByText('Mình dùng mẫu này trong phần viết.')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: 'Trả lời' })).toHaveLength(0);
  });

  it('creates a top-level reply and reconciles it into the parent thread', async () => {
    const reply = comment({
      id: 'reply-1',
      parentCommentId: 'comment-1',
      depth: 1,
      author: { id: 'user-3', displayName: 'Lan Anh' },
      content: 'Mình dùng mẫu này trong phần viết.',
    });
    const api = createApi({
      createComment: vi.fn().mockResolvedValue(reply),
    });

    renderDetail(api, true);
    await screen.findByText('Minh Hoàng');
    fireEvent.click(screen.getByRole('button', { name: 'Trả lời' }));
    fireEvent.change(screen.getByLabelText('Chia sẻ suy nghĩ của bạn'), {
      target: { value: 'Mình dùng mẫu này trong phần viết.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    await waitFor(() => {
      expect(api.createComment).toHaveBeenCalledWith('post-1', {
        content: 'Mình dùng mẫu này trong phần viết.',
        parentCommentId: 'comment-1',
      });
    });
    expect(await screen.findByText('Mình dùng mẫu này trong phần viết.')).toBeInTheDocument();
    expect(api.createComment).toHaveBeenCalledWith('post-1', {
      content: 'Mình dùng mẫu này trong phần viết.',
      parentCommentId: 'comment-1',
    });
  });

  it('blocks whitespace and over-limit comments without dropping the draft', async () => {
    const api = createApi();

    renderDetail(api, true);
    const input = await screen.findByLabelText('Chia sẻ suy nghĩ của bạn');
    fireEvent.change(input, { target: { value: ' '.repeat(5001) } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));

    expect(api.createComment).not.toHaveBeenCalled();
    expect(input).toHaveValue(' '.repeat(5001));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('supports owner comment edit and soft-delete reconciliation', async () => {
    const updated = comment({ content: 'Nội dung đã chỉnh sửa.' });
    const api = createApi({
      updateComment: vi.fn().mockResolvedValue(updated),
    });

    renderDetail(api, true, 'user-2');
    await screen.findByText('Minh Hoàng');
    const commentArticle = await screen.findByRole('article', {
      name: 'Bình luận của Minh Hoàng',
    });
    const commentMenuTrigger = within(commentArticle).getByRole('button', { name: /Tùy chọn bình luận/ });
    fireEvent.click(commentMenuTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chỉnh sửa' }));
    fireEvent.change(screen.getByLabelText('Nội dung', { selector: '#community-edit-comment' }), {
      target: { value: 'Nội dung đã chỉnh sửa.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(api.updateComment).toHaveBeenCalledWith('comment-1', {
        content: 'Nội dung đã chỉnh sửa.',
      });
    });
    expect(screen.getByText('Nội dung đã chỉnh sửa.')).toBeInTheDocument();

    fireEvent.click(commentMenuTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Xóa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bình luận' }));
    expect(await screen.findByText('Bình luận đã bị xóa')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thảo luận & Đóng góp tri thức' })).toHaveFocus();
    expect(api.deleteComment).toHaveBeenCalledWith('comment-1');
  });

  it('reports a comment with a valid category and bounded details', async () => {
    const api = createApi();

    renderDetail(api, true);
    const commentArticle = await screen.findByRole('article', {
      name: 'Bình luận của Minh Hoàng',
    });
    fireEvent.click(within(commentArticle).getByRole('button', { name: /Tùy chọn bình luận/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Báo cáo' }));
    fireEvent.change(screen.getByLabelText('Danh mục'), {
      target: { value: 'SPAM' },
    });
    fireEvent.change(screen.getByLabelText('Lý do'), {
      target: { value: 'Nội dung quảng cáo lặp lại.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(api.reportComment).toHaveBeenCalledWith('comment-1', {
      category: 'SPAM',
      details: 'Nội dung quảng cáo lặp lại.',
    });
  });

  it('uses the existing helpful, save, and share API operations', async () => {
    const api = createApi();

    renderDetail(api, true);
    await screen.findByText('Minh Hoàng');
    fireEvent.click(screen.getByRole('button', { name: /Hữu ích/ }));
    await waitFor(() => expect(api.addHelpful).toHaveBeenCalledWith('post-1'));
    fireEvent.click(screen.getAllByRole('button', { name: /Lưu/ })[0]);
    await waitFor(() => expect(api.savePost).toHaveBeenCalledWith('post-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    await waitFor(() => expect(api.getShareLink).toHaveBeenCalledWith('post-1'));
  });
});
