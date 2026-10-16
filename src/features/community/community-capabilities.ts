import { COMMUNITY_POST_TYPES, type CommunityPost } from './community.types';

// Presentation of the frozen Phase27/28 contract. The server still authorizes every action.
export function getCommunityCapabilities(post: Pick<CommunityPost, 'postType' | 'visibility' | 'isShareable'>, authenticated: boolean) {
  const supported = COMMUNITY_POST_TYPES.includes(post.postType);
  const primaryResponse = !supported ? null : post.postType === 'QUESTION' ? 'QA_ANSWER' : post.postType === 'CORRECTION_REQUEST' ? 'CORRECTION_PROPOSAL' : 'COMMENT';
  return {
    supported,
    primaryResponse,
    secondaryDiscussion: supported && primaryResponse !== 'COMMENT',
    publicShare: supported && post.visibility === 'PUBLIC' && post.isShareable,
    partnerShare: authenticated && post.visibility === 'PUBLIC' && post.isShareable && (post.postType === 'DISCUSSION' || post.postType === 'QUESTION'),
  } as const;
}
