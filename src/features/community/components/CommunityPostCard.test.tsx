import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityPostCard, type CommunityPostActionsApi } from './CommunityPostCard';
import type { CommunityPost } from '../community.types';

afterEach(cleanup);

function post(): CommunityPost {
  return {
    id: 'post-1',
    author: { id: 'author-1', displayName: 'Lan' },
    targetLanguage: {
      code: 'en',
      slug: 'english',
      nativeName: 'English',
      englishName: 'English',
      vietnameseName: 'Tiếng Anh',
      direction: 'ltr',
    },
    postType: 'DISCUSSION',
    content: 'A post for action testing.',
    cefrLevel: null,
    topic: null,
    visibility: 'PUBLIC',
    createdAt: '2026-09-12T09:00:00.000Z',
    updatedAt: '2026-09-12T09:00:00.000Z',
    editedAt: null,
    canonicalPath: '/community/posts/post-1',
    isShareable: true,
    isOwner: false,
    helpfulCount: 0,
    viewerReacted: false,
    commentCount: 0,
    isSaved: false,
  };
}

function createApi(): CommunityPostActionsApi {
  return {
    addHelpful: vi.fn(),
    removeHelpful: vi.fn(),
    savePost: vi.fn().mockResolvedValue({ postId: 'post-1', saved: true }),
    unsavePost: vi.fn(),
    getShareLink: vi.fn().mockResolvedValue({
      postId: 'post-1',
      canonicalPath: '/community/posts/post-1',
      isShareable: true,
    }),
    reportPost: vi.fn().mockResolvedValue({ submitted: true }),
  };
}

describe('CommunityPostCard', () => {
  it('confirms save only after the backend response', async () => {
    const api = createApi();
    const user = userEvent.setup();
    render(<CommunityPostCard post={post()} api={api} authenticated onAuthRequired={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Lưu bài viết' }));
    await waitFor(() => expect(api.savePost).toHaveBeenCalledWith('post-1'));
    expect(screen.getByRole('button', { name: 'Bỏ lưu bài viết' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses the returned share path and exposes a confirmation', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const api = createApi();
    const user = userEvent.setup();
    render(<CommunityPostCard post={post()} api={api} authenticated onAuthRequired={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Chia sẻ bài viết' }));
    await waitFor(() => expect(api.getShareLink).toHaveBeenCalledWith('post-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã sao chép liên kết chia sẻ.');
    expect(screen.getByRole('link', { name: 'Mở liên kết chia sẻ' })).toHaveAttribute(
      'href',
      '/community/posts/post-1',
    );
  });

  it('submits the supported post report fields and shows a generic submitted state', async () => {
    const api = createApi();
    const user = userEvent.setup();
    render(<CommunityPostCard post={post()} api={api} authenticated onAuthRequired={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Báo cáo bài viết' }));
    await user.selectOptions(screen.getByLabelText(/^Lý do báo cáo/), 'OTHER');
    await user.type(screen.getByLabelText('Chi tiết bổ sung'), 'Context for moderation.');
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    await waitFor(() => expect(api.reportPost).toHaveBeenCalledWith('post-1', {
      category: 'OTHER',
      details: 'Context for moderation.',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi báo cáo');
  });
});
