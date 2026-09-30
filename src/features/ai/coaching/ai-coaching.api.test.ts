import { describe, expect, it, vi } from 'vitest';
import { AiCoachingApi } from './ai-coaching.api';

describe('AiCoachingApi', () => {
  it('uses protected transport for writing and grammar requests', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ mode: 'writing_coach' });
    const api = new AiCoachingApi({ requestProtected });

    await api.write({ targetLanguageCode: 'en', text: 'I has a book.' });
    await api.grammar({ targetLanguageCode: 'en', explanationLanguage: 'VIETNAMESE', text: 'I go yesterday.' });

    expect(requestProtected).toHaveBeenNthCalledWith(1, '/ai/coaching/writing', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ targetLanguageCode: 'en', text: 'I has a book.' }),
    }));
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/ai/coaching/grammar', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ targetLanguageCode: 'en', explanationLanguage: 'VIETNAMESE', text: 'I go yesterday.' }),
    }));
  });
});
