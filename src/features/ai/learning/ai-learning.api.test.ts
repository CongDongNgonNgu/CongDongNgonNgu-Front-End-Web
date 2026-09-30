import { describe, expect, it, vi } from 'vitest';
import { AiLearningApi } from './ai-learning.api';

describe('AiLearningApi', () => {
  it('uses the protected library-learning route without exposing provider configuration', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ mode: 'learn_from_content' });
    const api = new AiLearningApi({ requestProtected });

    await api.learn({ resourceId: 'resource-09e', targetLanguageCode: 'en' });

    expect(requestProtected).toHaveBeenCalledWith(
      '/ai/learning/library',
      { method: 'POST', body: JSON.stringify({ resourceId: 'resource-09e', targetLanguageCode: 'en' }) },
    );
  });
});
