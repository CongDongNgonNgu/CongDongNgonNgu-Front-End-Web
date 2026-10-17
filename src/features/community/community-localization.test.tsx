import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiLocaleProvider } from '../ui-locale/UiLocaleProvider';
import { UI_LOCALE_STORAGE_KEY } from '../ui-locale/ui-locale';
import { CommunityPageView, type CommunityPageApi } from './pages/CommunityPage';
import { CommunityQuestionRequestPageView } from './pages/CommunityQuestionRequestPage';
import { CommunityCorrectionRequestPageView } from './pages/CommunityCorrectionRequestPage';
import { CommunityComposer } from './components/CommunityComposer';
import { CommunityReportDialog } from './components/CommunityReportDialog';
import type { CommunityPost } from './community.types';
import type { CommunityRequestApi } from './corrections.types';
import type { LanguageCatalogItem } from '../languages/languages.types';

const language: LanguageCatalogItem = {
  code: 'en', slug: 'english', nativeName: 'English', englishName: 'English',
  vietnameseName: 'Tiếng Anh', direction: 'ltr', active: true, launch: true, sortOrder: 1,
};
const post: CommunityPost = {
  id: 'post-1', author: { id: 'author-1', displayName: 'Lan' }, targetLanguage: language,
  postType: 'QUESTION', content: 'Câu hỏi gốc 😀', cefrLevel: null, topic: null,
  visibility: 'PUBLIC', createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z',
  editedAt: null, canonicalPath: '/community/posts/post-1', isShareable: false, isOwner: false,
  helpfulCount: 2, viewerReacted: false, commentCount: 1, isSaved: false,
};
function english(content: React.ReactNode) {
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, 'en');
  return render(<UiLocaleProvider><MemoryRouter>{content}</MemoryRouter></UiLocaleProvider>);
}
afterEach(() => { cleanup(); localStorage.removeItem(UI_LOCALE_STORAGE_KEY); });

describe('Community English target chrome', () => {
  it('localizes feed and post actions while retaining original user text', async () => {
    const api: CommunityPageApi = {
      listPosts: vi.fn().mockResolvedValue({ items: [post], nextCursor: null }),
      createPost: vi.fn(), addHelpful: vi.fn(), removeHelpful: vi.fn(), savePost: vi.fn(),
      unsavePost: vi.fn(), getShareLink: vi.fn(), reportPost: vi.fn(),
    };
    english(<CommunityPageView authenticated api={api} catalogApi={{ listLanguages: vi.fn().mockResolvedValue([language]) }} onAuthRequired={vi.fn()} />);
    expect(await screen.findByText(post.content)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learn together. Share your voice.' })).toBeInTheDocument();
    expect(screen.getByLabelText('By language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as helpful' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save post' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View post details by Lan' })).toBeInTheDocument();
    expect(screen.getByText('Question', { selector: 'span' })).toBeInTheDocument();
  });

  it('localizes the question form, validation and retained-draft submission errors', async () => {
    const user = userEvent.setup();
    const api = { createQuestion: vi.fn().mockRejectedValue(new Error('synthetic')), createCorrectionRequest: vi.fn(), getCorrectionRequest: vi.fn(), getQuestion: vi.fn() } satisfies CommunityRequestApi;
    english(<CommunityQuestionRequestPageView api={api} catalogApi={{ listLanguages: vi.fn().mockResolvedValue([language]) }} />);
    await screen.findByRole('option', { name: 'English · English' });
    await user.click(screen.getByRole('button', { name: 'Post question' }));
    expect(screen.getByText('Please choose a target language.')).toBeInTheDocument();
    expect(screen.getByText('A question cannot contain only whitespace.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Target language/), 'en');
    await user.type(screen.getByLabelText(/Question text/), post.content);
    await user.click(screen.getByRole('button', { name: 'Post question' }));
    expect(await screen.findByText('Unable to send your question. Your draft has been kept so you can try again.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Question text/)).toHaveValue(post.content);
    expect(api.createQuestion).toHaveBeenCalledWith(expect.objectContaining({ content: post.content, languageCode: 'en' }));
  });

  it('localizes correction intent and private visibility choices', async () => {
    const api = { createQuestion: vi.fn(), createCorrectionRequest: vi.fn(), getCorrectionRequest: vi.fn(), getQuestion: vi.fn() } satisfies CommunityRequestApi;
    english(<CommunityCorrectionRequestPageView api={api} catalogApi={{ listLanguages: vi.fn().mockResolvedValue([language]) }} />);
    await screen.findByRole('option', { name: 'English · English' });
    expect(screen.getByRole('heading', { name: 'Ask the community for corrections' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Grammar/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Natural expression/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Only me/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send correction request' })).toBeInTheDocument();
  });

  it('localizes report categories and validation inside the existing dialog', async () => {
    const user = userEvent.setup();
    english(<CommunityReportDialog open post={post} api={{ reportPost: vi.fn() }} authenticated onClose={vi.fn()} onAuthRequired={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Report post' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText('Please choose a report reason.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Harassment' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Additional details')).toBeInTheDocument());
  });
});

it('localizes the feed composer close label',()=>{english(<CommunityComposer open authenticated languages={[language]} api={{createPost:vi.fn()}} onClose={vi.fn()} onCreated={vi.fn()} onAuthRequired={vi.fn()}/>);expect(screen.getByRole('button',{name:'Close'})).toBeInTheDocument();});
