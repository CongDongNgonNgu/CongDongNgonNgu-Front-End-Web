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
});
