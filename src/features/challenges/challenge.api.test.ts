import { describe, expect, it, vi } from 'vitest';
import { ChallengeApi } from './challenge.api';

describe('ChallengeApi', () => {
  it('builds bounded public discovery queries', async () => {
    const requestPublic = vi.fn().mockResolvedValue([]);
    const api = new ChallengeApi({ requestPublic, requestProtected: vi.fn() });

    await api.list({ state: 'UPCOMING', languageCode: 'vi', limit: 20 });

    expect(requestPublic).toHaveBeenCalledWith('/challenges?state=UPCOMING&languageCode=vi&limit=20');
  });

  it('keeps challenge identifiers encoded and separates public/protected actions', async () => {
    const requestPublic = vi.fn().mockResolvedValue({ id: 'challenge/1' });
    const requestProtected = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ replayed: false, participation: { status: 'JOINED' } })
      .mockResolvedValueOnce({ status: 'LEFT' });
    const api = new ChallengeApi({ requestPublic, requestProtected });

    await api.get('challenge/1');
    await api.getProgress('challenge/1');
    await api.join('challenge/1');
    await api.leave('challenge/1');

    expect(requestPublic).toHaveBeenCalledWith('/challenges/challenge%2F1');
    expect(requestProtected).toHaveBeenNthCalledWith(1, '/challenges/challenge%2F1/progress');
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/challenges/challenge%2F1/join', { method: 'POST' });
    expect(requestProtected).toHaveBeenNthCalledWith(3, '/challenges/challenge%2F1/join', { method: 'DELETE' });
  });
});
