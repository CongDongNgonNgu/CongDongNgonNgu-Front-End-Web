import { describe, expect, it } from 'vitest';
import { COMMUNITY_POST_TYPES } from './community.types';
import { getCommunityCapabilities } from './community-capabilities';

describe('frozen Community capabilities', () => {
  it.each(COMMUNITY_POST_TYPES)('preserves primary response and sharing for %s', postType => {
    const capabilities = getCommunityCapabilities({ postType, visibility: 'PUBLIC', isShareable: true }, true);
    expect(capabilities.primaryResponse).toBe(postType === 'QUESTION' ? 'QA_ANSWER' : postType === 'CORRECTION_REQUEST' ? 'CORRECTION_PROPOSAL' : 'COMMENT');
    expect(capabilities.partnerShare).toBe(postType === 'DISCUSSION' || postType === 'QUESTION');
    expect(capabilities.publicShare).toBe(true);
    expect(capabilities.secondaryDiscussion).toBe(['QUESTION', 'CORRECTION_REQUEST'].includes(postType));
  });
  it.each(COMMUNITY_POST_TYPES)('does not broaden partner sharing for %s', postType => {
    expect(getCommunityCapabilities({ postType, visibility: 'PUBLIC', isShareable: true }, false).partnerShare).toBe(false);
    expect(getCommunityCapabilities({ postType, visibility: 'PRIVATE', isShareable: false }, true).partnerShare).toBe(false);
    expect(getCommunityCapabilities({ postType, visibility: 'PUBLIC', isShareable: false }, true).partnerShare).toBe(false);
  });
});

it('fails closed for an unknown runtime post type and inconsistent private payload', () => {
  const unknown = {postType:'FUTURE_TYPE', visibility:'PUBLIC', isShareable:true} as unknown as Parameters<typeof getCommunityCapabilities>[0];
  expect(getCommunityCapabilities(unknown,true)).toEqual({supported:false,primaryResponse:null,secondaryDiscussion:false,publicShare:false,partnerShare:false});
  expect(getCommunityCapabilities({...unknown,postType:'DISCUSSION',visibility:'PRIVATE'},true).publicShare).toBe(false);
});
