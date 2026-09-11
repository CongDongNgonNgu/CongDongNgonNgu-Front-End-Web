import { describe, expect, it, vi } from 'vitest';
import { LanguageApi } from './language-api';

describe('LanguageApi', () => {
  it('uses the backend catalog and overview contracts with encoded query state', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce([{ slug: 'english' }])
      .mockResolvedValueOnce({ language: { slug: 'english' }, filters: { levels: ['A1'] } });
    const api = new LanguageApi({ get });

    await expect(api.listLanguages('Tiếng Nhật')).resolves.toEqual([{ slug: 'english' }]);
    await expect(api.getOverview('english', { levels: ['A1', 'B2'], topic: 'space opera' }))
      .resolves.toEqual({ language: { slug: 'english' }, filters: { levels: ['A1'] } });

    expect(get).toHaveBeenNthCalledWith(1, '/languages?search=Ti%E1%BA%BFng+Nh%E1%BA%ADt');
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/languages/english/overview?level=A1%2CB2&topic=space-opera',
    );
  });

  it('loads an individual language using the canonical slug returned by the route', async () => {
    const get = vi.fn().mockResolvedValue({ slug: 'vietnamese' });
    const api = new LanguageApi({ get });

    await expect(api.getLanguage('vietnamese')).resolves.toEqual({ slug: 'vietnamese' });
    expect(get).toHaveBeenCalledWith('/languages/vietnamese');
  });
});
