import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { LibraryLearnFromResourcePanel } from './LibraryLearnFromResourcePanel';
import type { LibraryPublicResource } from '../library.types';
import type { AiLearningResult } from '../../ai/learning/ai-learning.types';

afterEach(() => cleanup());

const resource: LibraryPublicResource = {
  id: 'resource-09e', resourceType: 'SENTENCE', primaryLanguageCode: 'en', secondaryLanguageCode: null, cefrLevel: 'A2', topics: ['daily-life'], reviewState: 'VERIFIED',
  details: { resourceType: 'SENTENCE', text: 'A safe public sentence.', context: null },
  provenance: [{ sourceType: 'COMMUNITY_POST', sourceId: 'public-source-09e', sourceUrl: 'https://example.com/source', originalAuthorReference: null, attribution: 'Community author', license: { licenseKey: 'CC-BY-4.0', displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true, redistributionAllowed: true, derivativeConstraints: null } }],
  createdAt: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T00:00:00.000Z',
};

const result: AiLearningResult = {
  contractVersion: 'ai.learning.v1', mode: 'learn_from_content', source: 'AI_GENERATED',
  learnerContext: { targetLanguage: { code: 'en', name: 'English' }, proficiency: { effective: 'B1' } },
  sourceResource: { id: 'resource-09e', resourceType: 'SENTENCE', primaryLanguageCode: 'en', secondaryLanguageCode: null, cefrLevel: 'A2', topics: ['daily-life'], provenance: [{ sourceType: 'COMMUNITY_POST', sourceUrl: 'https://example.com/source', attribution: 'Community author', license: { licenseKey: 'CC-BY-4.0', displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/' } }] },
  output: {
    version: 'ai.output.v1', kind: 'LEARN_FROM_CONTENT', summary: 'Practice this resource.',
    vocabulary: [{ term: 'welcome', meaning: 'a greeting', exampleSentence: 'Welcome to class.' }],
    grammarNotes: [{ title: 'Present simple', explanation: 'Use it for routines.', example: 'I study every day.' }],
    questions: [{ question: 'What is the main idea?', answerGuide: 'Mention the routine.' }],
    miniQuiz: [{ question: 'Choose the greeting.', options: ['Welcome', 'Goodbye'], correctOptionIndex: 0, explanation: 'Welcome is a greeting.' }],
    speakingPrompts: [{ prompt: 'Describe your routine.', followUp: 'Add a time expression.' }],
  },
};

type LearningApi = { learn: (input: { resourceId: string }) => Promise<AiLearningResult> };

function renderPanel(api: LearningApi, authenticated = true) {
  return render(
    <MemoryRouter>
      <LibraryLearnFromResourcePanel resource={resource} api={api} authenticated={authenticated} />
    </MemoryRouter>,
  );
}

describe('LibraryLearnFromResourcePanel', () => {
  it('renders the structured learning result with source distinction and attribution link', async () => {
    const user = userEvent.setup();
    const api: LearningApi = { learn: vi.fn(async () => result) };
    renderPanel(api);

    await user.click(screen.getByRole('button', { name: /Học từ bài này/ }));

    expect(await screen.findByText('Nội dung học do AI tạo')).toBeVisible();
    expect(screen.getByText('welcome')).toBeVisible();
    expect(screen.getByText('Present simple')).toBeVisible();
    expect(screen.getByText('What is the main idea?')).toBeVisible();
    expect(screen.getByText('Choose the greeting.')).toBeVisible();
    expect(screen.getByText('Describe your routine.')).toBeVisible();
    expect(screen.getByRole('link', { name: /xem nguồn gốc/ })).toHaveAttribute('href', 'https://example.com/source');
    expect(api.learn).toHaveBeenCalledWith({ resourceId: 'resource-09e' });
  });

  it('exposes loading and quota error states without provider details', async () => {
    const user = userEvent.setup();
    let resolve: (value: AiLearningResult) => void = () => undefined;
    const api: LearningApi = { learn: vi.fn(() => new Promise<AiLearningResult>((next) => { resolve = next; })) };
    renderPanel(api);
    const button = screen.getByRole('button', { name: /Học từ bài này/ });
    await user.click(button);
    expect(screen.getByRole('status')).toHaveTextContent('Đang trích xuất');
    expect(button).toBeDisabled();
    resolve(result);

    cleanup();
    const quotaApi: LearningApi = { learn: vi.fn(async () => { throw new ApiClientError('quota', 429, 'AI_QUOTA_EXCEEDED'); }) };
    renderPanel(quotaApi);
    await user.click(screen.getByRole('button', { name: /Học từ bài này/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hạn ngạch hoặc tốc độ sử dụng AI');
    expect(screen.queryByText('quota')).not.toBeInTheDocument();
  });

  it('keeps the action disabled and offers sign-in for anonymous learners', () => {
    const api: LearningApi = { learn: vi.fn(async () => result) };
    renderPanel(api, false);
    expect(screen.getByRole('button', { name: /Học từ bài này/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Đăng nhập/ })).toHaveAttribute('href', '/login');
    expect(api.learn).not.toHaveBeenCalled();
  });
});
