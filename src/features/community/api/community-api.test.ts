import { describe, expect, it, vi } from 'vitest';
import { CommunityApi } from './community-api';

function createClient() {
  return {
    requestPublic: vi.fn(),
    requestProtected: vi.fn(),
  };
}

describe('CommunityApi', () => {
  it('builds the language-filtered opaque-cursor feed request', async () => {
    const client = createClient();
    client.requestPublic.mockResolvedValue({ items: [], nextCursor: null });
    const api = new CommunityApi(client);

    await api.listPosts({ languageCode: 'ja', limit: 20, cursor: 'opaque cursor' }, false);

    expect(client.requestPublic).toHaveBeenCalledWith(
      '/community/posts?languageCode=ja&limit=20&cursor=opaque+cursor',
    );
  });

  it('uses the protected transport for authenticated feed state and create', async () => {
    const client = createClient();
    client.requestProtected.mockResolvedValue({ items: [], nextCursor: null });
    const api = new CommunityApi(client);

    await api.listPosts({}, true);
    await api.createPost({
      postType: 'DISCUSSION',
      languageCode: 'vi',
      content: 'Xin chào',
      visibility: 'PUBLIC',
    });

    expect(client.requestProtected).toHaveBeenNthCalledWith(1, '/community/posts');
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      2,
      '/community/posts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          postType: 'DISCUSSION',
          languageCode: 'vi',
          content: 'Xin chào',
          visibility: 'PUBLIC',
        }),
      }),
    );
  });

  it('keeps post-level mutations explicit and maps supported report fields', async () => {
    const client = createClient();
    client.requestProtected.mockResolvedValue({});
    client.requestPublic.mockResolvedValue({ postId: 'post-1', canonicalPath: '/community/posts/post-1', isShareable: true });
    const api = new CommunityApi(client);

    await api.addHelpful('post-1');
    await api.removeHelpful('post-1');
    await api.savePost('post-1');
    await api.unsavePost('post-1');
    await api.getShareLink('post-1');
    await api.reportPost('post-1', { category: 'OTHER', details: 'Context' });

    expect(client.requestProtected).toHaveBeenNthCalledWith(1, '/community/posts/post-1/reactions', expect.anything());
    expect(client.requestProtected).toHaveBeenNthCalledWith(2, '/community/posts/post-1/reactions/HELPFUL', { method: 'DELETE' });
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      3,
      '/community/posts/post-1/save',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(4, '/community/posts/post-1/save', { method: 'DELETE' });
    expect(client.requestPublic).toHaveBeenCalledWith('/community/posts/post-1/share');
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      5,
      '/community/reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ targetType: 'POST', targetId: 'post-1', category: 'OTHER', details: 'Context' }),
      }),
    );
  });

  it('uses the public or protected detail and comment reads without changing the route contract', async () => {
    const client = createClient();
    client.requestPublic.mockResolvedValue({});
    client.requestProtected.mockResolvedValue({});
    const api = new CommunityApi(client);

    await api.getPost('post-1');
    await api.getPost('post-1', true);
    await api.listComments('post-1', { limit: 20, cursor: 'opaque cursor' });
    await api.listComments('post-1', {}, true);

    expect(client.requestPublic).toHaveBeenNthCalledWith(1, '/community/posts/post-1');
    expect(client.requestProtected).toHaveBeenNthCalledWith(1, '/community/posts/post-1');
    expect(client.requestPublic).toHaveBeenNthCalledWith(
      2,
      '/community/posts/post-1/comments?limit=20&cursor=opaque+cursor',
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(2, '/community/posts/post-1/comments');
  });

  it('maps post, comment, reply and comment-report mutations to backend-supported fields', async () => {
    const client = createClient();
    client.requestProtected.mockResolvedValue({});
    const api = new CommunityApi(client);

    await api.updatePost('post-1', {
      postType: 'QUESTION',
      languageCode: 'ja',
      content: 'Updated content',
      cefrLevel: null,
      topic: null,
      visibility: 'PUBLIC',
    });
    await api.deletePost('post-1');
    await api.createComment('post-1', { content: 'Top-level' });
    await api.createComment('post-1', { content: 'Reply', parentCommentId: 'comment-1' });
    await api.updateComment('comment-1', { content: 'Edited comment' });
    await api.deleteComment('comment-1');
    await api.reportComment('comment-1', { category: 'OTHER', details: 'Context' });

    expect(client.requestProtected).toHaveBeenNthCalledWith(
      1,
      '/community/posts/post-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({
        postType: 'QUESTION',
        languageCode: 'ja',
        content: 'Updated content',
        cefrLevel: null,
        topic: null,
        visibility: 'PUBLIC',
      }) }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(2, '/community/posts/post-1', { method: 'DELETE' });
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      3,
      '/community/posts/post-1/comments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ content: 'Top-level' }) }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      4,
      '/community/posts/post-1/comments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ content: 'Reply', parentCommentId: 'comment-1' }) }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      5,
      '/community/comments/comment-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ content: 'Edited comment' }) }),
    );
    expect(client.requestProtected).toHaveBeenNthCalledWith(6, '/community/comments/comment-1', { method: 'DELETE' });
    expect(client.requestProtected).toHaveBeenNthCalledWith(
      7,
      '/community/reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ targetType: 'COMMENT', targetId: 'comment-1', category: 'OTHER', details: 'Context' }),
      }),
    );
  });
});
