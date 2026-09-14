import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityComposer } from './CommunityComposer';
import type { CommunityPost } from '../community.types';

afterEach(cleanup);

const languages = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese' },
];

const createdPost: CommunityPost = {
  id: 'post-1',
  author: { id: 'user-1', displayName: 'Lan' },
  targetLanguage: {
    code: 'en',
    slug: 'english',
    nativeName: 'English',
    englishName: 'English',
    vietnameseName: 'Tiếng Anh',
    direction: 'ltr',
  },
  postType: 'QUESTION',
  content: 'Explain this phrase.',
  cefrLevel: 'A2',
  topic: 'work',
  visibility: 'PUBLIC',
  createdAt: '2026-09-12T09:00:00.000Z',
  updatedAt: '2026-09-12T09:00:00.000Z',
  editedAt: null,
  canonicalPath: '/community/posts/post-1',
  isShareable: true,
  isOwner: true,
  helpfulCount: 0,
  viewerReacted: false,
  commentCount: 0,
  isSaved: false,
};

function renderComposer(overrides: Partial<React.ComponentProps<typeof CommunityComposer>> = {}) {
  const api = {
    createPost: vi.fn().mockResolvedValue(createdPost),
  };
  const props: React.ComponentProps<typeof CommunityComposer> = {
    open: true,
    authenticated: true,
    languages,
    api,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    onAuthRequired: vi.fn(),
    ...overrides,
  };
  render(<CommunityComposer {...props} />);
  return { api, props };
}

describe('CommunityComposer', () => {
  it('shows required validation and an accessible Unicode-safe content count', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: 'Đăng bài' }));
    expect(screen.getByText('Vui lòng chọn loại bài viết.')).toBeVisible();
    expect(screen.getByText('Vui lòng chọn ngôn ngữ mục tiêu.')).toBeVisible();
    expect(screen.getByText('Nội dung không thể chỉ chứa khoảng trắng.')).toBeVisible();

    const content = screen.getByLabelText(/^Nội dung/);
    await user.type(content, '😀');
    expect(screen.getByText('1 / 20.000 ký tự')).toBeVisible();
  });

  it('submits only the supported plain-text create fields', async () => {
    const user = userEvent.setup();
    const { api, props } = renderComposer();

    await user.selectOptions(screen.getByLabelText(/^Loại bài viết/), 'QUESTION');
    await user.selectOptions(screen.getByLabelText(/^Ngôn ngữ mục tiêu/), 'en');
    await user.type(screen.getByLabelText(/^Nội dung/), '<script>alert(1)</script>');
    await user.selectOptions(screen.getByLabelText(/CEFR/), 'A2');
    await user.type(screen.getByLabelText(/^Chủ đề/), 'work');
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }));

    await waitFor(() => expect(api.createPost).toHaveBeenCalledWith({
      postType: 'QUESTION',
      languageCode: 'en',
      content: '<script>alert(1)</script>',
      cefrLevel: 'A2',
      topic: 'work',
      visibility: 'PUBLIC',
    }));
    expect(props.onCreated).toHaveBeenCalledWith(createdPost);
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('textbox', { name: 'Tiêu đề' })).not.toBeInTheDocument();
  });

  it('keeps the composer behind the existing auth flow when unauthenticated', async () => {
    const user = userEvent.setup();
    const onAuthRequired = vi.fn();
    renderComposer({ authenticated: false, onAuthRequired });

    await user.click(screen.getByRole('button', { name: 'Đăng bài' }));
    expect(onAuthRequired).toHaveBeenCalledOnce();
  });

  it('matches the canonical composer structure for metadata, visibility, and actions', () => {
    renderComposer();

    expect(screen.getByRole('heading', { name: 'Chia sẻ bài viết' })).toBeVisible();
    expect(screen.getByText(/Không gian đóng góp tri thức/)).toBeVisible();
    expect(screen.getByText('Thông tin học tập (không bắt buộc)')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Phạm vi hiển thị' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Công khai với cộng đồng/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Chỉ lưu vào nhật ký cá nhân/ })).toBeInTheDocument();
    expect(screen.getByRole('dialog').querySelector('form')).toHaveAttribute('id', 'community-composer-form');
  });

  it('submits the supported private visibility value', async () => {
    const user = userEvent.setup();
    const { api } = renderComposer();

    await user.selectOptions(screen.getByLabelText(/^Loại bài viết/), 'QUESTION');
    await user.selectOptions(screen.getByLabelText(/^Ngôn ngữ mục tiêu/), 'en');
    await user.type(screen.getByLabelText(/^Nội dung/), 'A private language-learning note.');
    await user.click(screen.getByRole('radio', { name: /Chỉ lưu vào nhật ký cá nhân/ }));
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }));

    await waitFor(() => expect(api.createPost).toHaveBeenCalledWith({
      postType: 'QUESTION',
      languageCode: 'en',
      content: 'A private language-learning note.',
      visibility: 'PRIVATE',
    }));
  });
});
