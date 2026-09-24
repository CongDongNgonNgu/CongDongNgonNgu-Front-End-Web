import { describe, expect, it, vi } from 'vitest';
import { LibraryContributionApi } from './library.contribution.api';

describe('LibraryContributionApi', () => {
  it('uses public policy transport and the protected three-stage contract', async () => {
    const requestPublic = vi.fn().mockResolvedValue({ termsVersion: 'server-v2', approvedResourceTypes: ['VOCABULARY'], licenses: [] });
    const requestProtected = vi.fn()
      .mockResolvedValueOnce({ id: 'resource-1' })
      .mockResolvedValueOnce({ id: 'provenance-1' })
      .mockResolvedValueOnce({ resource: { id: 'resource-1' } });
    const api = new LibraryContributionApi({ requestPublic, requestProtected });

    await expect(api.getPolicy()).resolves.toMatchObject({ termsVersion: 'server-v2' });
    await api.createResource({
      resourceType: 'VOCABULARY',
      primaryLanguageCode: 'vi',
      secondaryLanguageCode: null,
      cefrLevel: null,
      topics: ['daily-life'],
      visibility: 'PUBLIC',
      details: { resourceType: 'VOCABULARY', term: 'xin chào', definition: 'greeting', partOfSpeech: '', exampleSentence: '' },
    });
    await api.attachProvenance('resource/1', {
      sourceType: 'ORIGINAL_AUTHOR',
      sourceId: 'community-contribution:resource/1',
      licenseKey: 'CC-BY-4.0',
      attribution: 'A contributor',
    });
    await api.submitContribution('resource/1', {
      termsVersion: 'server-v2',
      rightsConfirmed: true,
      reuseConsent: true,
    });

    expect(requestPublic).toHaveBeenCalledWith('/library/contribution-policy');
    expect(requestProtected).toHaveBeenNthCalledWith(1, '/library/resources', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(requestProtected.mock.calls[0][1].body)).toMatchObject({ visibility: 'PUBLIC' });
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/library/resources/resource%2F1/provenance', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(requestProtected.mock.calls[1][1].body)).not.toHaveProperty('originalContributorUserId');
    expect(requestProtected).toHaveBeenNthCalledWith(3, '/library/resources/resource%2F1/submit-contribution', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(requestProtected.mock.calls[2][1].body)).toEqual({
      termsVersion: 'server-v2',
      rightsConfirmed: true,
      reuseConsent: true,
    });
  });
});
