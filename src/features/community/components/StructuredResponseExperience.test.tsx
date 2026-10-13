import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '../community.types';
import type {
  CommunityRequestApi,
  CommunityStructuredResponseApi,
  CorrectionRequestResponse,
  StructuredResponseResponse,
} from '../corrections.types';
import { StructuredResponseExperience } from './StructuredResponseExperience';

function post(isOwner = false): CommunityPost {
  return {
    id: 'post-1',
    author: { id: 'owner-1', displayName: 'Nguyễn Minh' },
    targetLanguage: {
      code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr',
    },
    postType: 'CORRECTION_REQUEST', content: 'Context', cefrLevel: 'B1', topic: 'writing', visibility: 'PUBLIC',
    createdAt: '2026-09-15T08:00:00.000Z', updatedAt: '2026-09-15T08:00:00.000Z', editedAt: null,
    canonicalPath: '/community/posts/post-1', isShareable: true, isOwner, helpfulCount: 0, viewerReacted: false, commentCount: 0, isSaved: false,
  };
}

function response(overrides: Partial<StructuredResponseResponse> = {}): StructuredResponseResponse {
  return {
    id: 'response-1', parentPostId: 'post-1', author: { id: 'contributor-1', displayName: 'Lê Mai' },
    responseKind: 'CORRECTION_PROPOSAL', correctedText: 'Tôi đã đi học vào ngày mai.', answerText: null,
    explanation: 'Dùng thì tương lai cho ngày mai.', createdAt: '2026-09-15T08:10:00.000Z', updatedAt: '2026-09-15T08:10:00.000Z', editedAt: null,
    isDeleted: false, helpfulCount: 2, viewerHelpful: false, isAccepted: false, acceptedAt: null, libraryCandidateState: null, canAccept: false, canVote: true, canNominateCandidate: false,
    ...overrides,
  };
}

function correction(): CorrectionRequestResponse {
  return { post: post(), correction: { postId: 'post-1', originalText: 'Tôi đã đi học vào ngày mai.', correctionIntent: 'GRAMMAR', context: 'Ví dụ với diacritics.', createdAt: '2026-09-15T08:00:00.000Z', updatedAt: '2026-09-15T08:00:00.000Z' } };
}

function createApis(item = response()) {
  const api: CommunityStructuredResponseApi = {
    listStructuredResponses: vi.fn().mockResolvedValue({ items: [item], nextCursor: null }),
    createStructuredResponse: vi.fn().mockResolvedValue(response({ id: 'response-2', correctedText: 'Tôi sẽ đi học vào ngày mai.' })),
    addStructuredResponseHelpful: vi.fn().mockResolvedValue(response({ helpfulCount: 3, viewerHelpful: true })),
    removeStructuredResponseHelpful: vi.fn().mockResolvedValue(response({ helpfulCount: 1, viewerHelpful: false })),
    nominateStructuredResponseAsLibraryCandidate: vi.fn().mockResolvedValue({
      id: 'candidate-1', sourcePostId: 'post-1', sourceResponseId: item.id, contributorUserId: 'contributor-1',
      targetLanguageCode: 'vi', responseKind: 'CORRECTION_PROPOSAL', sourceText: 'Tôi đã đi học vào ngày mai.',
      correctedText: 'Tôi sẽ đi học vào ngày mai.', answerText: null, explanation: 'Dùng thì tương lai.',
      state: 'PENDING_REVIEW', submittedForReview: true, createdAt: '2026-09-15T09:00:00.000Z',
    }),
    acceptStructuredResponse: vi.fn().mockResolvedValue(response({ isAccepted: true, acceptedAt: '2026-09-15T09:00:00.000Z', canAccept: true })),
    revokeStructuredResponseAcceptance: vi.fn().mockResolvedValue({ parentPostId: 'post-1', responseId: item.id, acceptedAt: null, revoked: true }),
  };
  const requestApi: Pick<CommunityRequestApi, 'getCorrectionRequest'> = {
    getCorrectionRequest: vi.fn().mockResolvedValue(correction()),
  };
  return { api, requestApi };
}

afterEach(() => { cleanup(); window.localStorage.removeItem('congdongngonngu.ui-locale.v1'); });

describe('StructuredResponseExperience', () => {

  it('loads the correction source and renders a semantic diff with safe text', async () => {
    const { api, requestApi } = createApis(response({ correctedText: '<script>alert(1)</script>' }));
    render(<StructuredResponseExperience parent={post()} authenticated requestApi={requestApi} api={api} onAuthRequired={vi.fn()} />);

    expect(await screen.findByText('Bản gốc cần xem xét')).toBeInTheDocument();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Đề xuất sửa câu của Lê Mai' })).toBeInTheDocument();
    expect(requestApi.getCorrectionRequest).toHaveBeenCalledWith('post-1', true);
    expect(api.listStructuredResponses).toHaveBeenCalledWith('post-1', { limit: 20 }, true);
    expect(document.querySelector('script')).toBeNull();
  });

  it('submits a correction proposal and updates Helpful from the server response', async () => {
    const user = userEvent.setup();
    const { api, requestApi } = createApis();
    render(<StructuredResponseExperience parent={post()} authenticated requestApi={requestApi} api={api} onAuthRequired={vi.fn()} />);

    await screen.findByText('Bản gốc cần xem xét');
    await user.type(screen.getByRole('textbox', { name: /Bản sửa đề xuất/ }), ' Tôi sẽ đi học.');
    await user.click(screen.getByRole('button', { name: 'Gửi đề xuất sửa câu' }));
    await waitFor(() => expect(api.createStructuredResponse).toHaveBeenCalledWith('post-1', expect.objectContaining({ responseKind: 'CORRECTION_PROPOSAL' })));
    const firstResponse = screen.getAllByRole('article', { name: 'Đề xuất sửa câu của Lê Mai' })[0];
    await user.click(within(firstResponse).getByRole('button', { name: 'Đề xuất hữu ích · 2' }));
    await waitFor(() => expect(api.addStructuredResponseHelpful).toHaveBeenCalledWith('response-2'));
  });

  it('lets the requester accept a response and hides self-helpful voting', async () => {
    const user = userEvent.setup();
    const acceptedResponse = response({ canAccept: true, canVote: false });
    const { api, requestApi } = createApis(acceptedResponse);
    render(<StructuredResponseExperience parent={post(true)} authenticated requestApi={requestApi} api={api} onAuthRequired={vi.fn()} />);

    await screen.findByText('Bản gốc cần xem xét');
    expect(screen.queryByRole('button', { name: /Đề xuất hữu ích/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Chấp nhận bản sửa' }));
    await waitFor(() => expect(api.acceptStructuredResponse).toHaveBeenCalledWith('post-1', 'response-1'));
    expect(await screen.findByText('Được người hỏi chấp nhận')).toBeInTheDocument();
  });

  it('lets the requester nominate the accepted response without implying verification', async () => {
    const user = userEvent.setup();
    const acceptedResponse = response({ canAccept: true, canVote: false, isAccepted: true, canNominateCandidate: true });
    const { api, requestApi } = createApis(acceptedResponse);
    render(<StructuredResponseExperience parent={post(true)} authenticated requestApi={requestApi} api={api} onAuthRequired={vi.fn()} />);

    await screen.findByRole('article', { name: 'Đề xuất sửa câu của Lê Mai' });
    await user.click(screen.getByRole('button', { name: 'Đề cử vào Thư viện' }));
    await waitFor(() => expect(api.nominateStructuredResponseAsLibraryCandidate).toHaveBeenCalledWith('response-1'));
    expect(await screen.findByText('Đã gửi để xem xét · chưa được xác minh')).toBeInTheDocument();
  });
});

it('keeps the question original outside the structured response area and never adds answer replies', async () => {
  const { api, requestApi } = createApis(response({responseKind:'QA_ANSWER', answerText:'A useful answer', correctedText:null}));
  render(<StructuredResponseExperience parent={{...post(),postType:'QUESTION',content:'The question body'}} authenticated api={api} requestApi={requestApi} onAuthRequired={vi.fn()}/>);
  await screen.findByText('A useful answer');
  expect(screen.queryByText('The question body')).toBeNull();
  expect(screen.queryByRole('button',{name:'Trả lời'})).toBeNull();
  expect(requestApi.getCorrectionRequest).not.toHaveBeenCalled();
});

it('does not substitute mutable post content when canonical correction lookup fails', async () => {
  const { api, requestApi } = createApis();
  vi.mocked(requestApi.getCorrectionRequest).mockRejectedValue(new Error('unavailable'));
  render(<StructuredResponseExperience parent={{...post(),content:'Edited content'}} authenticated api={api} requestApi={requestApi} onAuthRequired={vi.fn()}/>);
  await screen.findByRole('alert');
  expect(screen.queryByText('Edited content')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('renders English answer controls while preserving contributor text verbatim', async () => {
  window.localStorage.setItem('congdongngonngu.ui-locale.v1','en');
  const { api, requestApi } = createApis(response({responseKind:'QA_ANSWER',answerText:'Xin chào — 😀',correctedText:null}));
  render(<UiLocaleProvider><StructuredResponseExperience parent={{...post(),postType:'QUESTION'}} authenticated api={api} requestApi={requestApi} onAuthRequired={vi.fn()}/></UiLocaleProvider>);
  expect(await screen.findByText('Xin chào — 😀')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Answers'})).toBeInTheDocument();
  expect(screen.getByRole('textbox',{name:'Answer'})).toHaveAttribute('rows','3');
  expect(screen.getByRole('button',{name:'Add explanation'})).toHaveAttribute('aria-expanded','false');
  expect(screen.getByRole('button',{name:'Answer helpful · 2'})).toHaveAttribute('aria-pressed','false');
  expect(screen.queryByText('Câu trả lời')).toBeNull();
});
