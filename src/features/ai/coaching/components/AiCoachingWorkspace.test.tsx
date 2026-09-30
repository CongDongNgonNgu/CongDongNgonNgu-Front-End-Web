import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AiCoachingWorkspace } from './AiCoachingWorkspace';
import type { AiGrammarCoachResult, AiWritingCoachResult } from '../ai-coaching.types';

const targetLanguage = { code: 'en', name: 'English', proficiency: 'B1' };

const writingResult: AiWritingCoachResult = {
  contractVersion: 'ai.coaching.v1',
  mode: 'writing_coach',
  source: 'AI_GENERATED',
  originalText: 'I has a book.',
  learnerContext: { targetLanguage: { code: 'en', name: 'English' }, proficiency: { effective: 'B1' } },
  output: {
    version: 'ai.output.v1',
    kind: 'WRITING_CORRECTION',
    summary: 'Subject and verb agreement can be clearer.',
    corrections: [{
      originalText: 'I has a book.',
      correctedText: 'I have a book.',
      explanation: 'Use have with I.',
      naturalAlternative: 'I own a book.',
    }],
  },
};

const grammarResult: AiGrammarCoachResult = {
  contractVersion: 'ai.coaching.v1',
  mode: 'grammar_coach',
  source: 'AI_GENERATED',
  originalText: 'I go yesterday.',
  learnerContext: { targetLanguage: { code: 'en', name: 'English' }, proficiency: { effective: 'B1' } },
  output: {
    version: 'ai.output.v1',
    kind: 'GRAMMAR_COACHING',
    explanation: 'Use the past form for a completed action.',
    examples: [{ incorrectText: 'I go yesterday.', correctedText: 'I went yesterday.', explanation: 'Went is the past form.' }],
    practiceItems: [{ prompt: 'I ___ yesterday.', answer: 'went', explanation: 'Went is the past form of go.' }],
  },
};

function renderWorkspace(overrides: Partial<React.ComponentProps<typeof AiCoachingWorkspace>> = {}) {
  const props: React.ComponentProps<typeof AiCoachingWorkspace> = {
    authenticated: true,
    mode: 'writing',
    targetLanguage,
    text: '',
    writingTask: '',
    goal: '',
    grammarFocus: '',
    explanationLanguage: 'TARGET',
    correctionStyle: 'CONCISE',
    isLoading: false,
    error: null,
    result: null,
    onTextChange: vi.fn(),
    onWritingTaskChange: vi.fn(),
    onGoalChange: vi.fn(),
    onGrammarFocusChange: vi.fn(),
    onExplanationLanguageChange: vi.fn(),
    onCorrectionStyleChange: vi.fn(),
    onSubmit: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  return { ...render(<MemoryRouter><AiCoachingWorkspace {...props} /></MemoryRouter>), props };
}

afterEach(cleanup);

describe('AiCoachingWorkspace', () => {
  it('keeps the writing original visible beside a structured AI suggestion', () => {
    renderWorkspace({ text: writingResult.originalText, result: writingResult });

    expect(screen.getByRole('heading', { name: 'Trợ lý Viết & Ngữ pháp AI' })).toBeInTheDocument();
    expect(screen.getByText('Văn bản gốc của bạn')).toBeInTheDocument();
    expect(screen.getAllByText('I has a book.').length).toBeGreaterThan(1);
    expect(screen.getByText('have', { selector: 'ins' })).toBeInTheDocument();
    expect(screen.getByText('Hướng dẫn tạo bởi AI')).toBeInTheDocument();
    expect(screen.getByText(/chưa qua kiểm duyệt bởi chuyên gia bản xứ/i)).toBeInTheDocument();
    expect(screen.getByText('I own a book.')).toBeInTheDocument();
  });

  it('renders grammar explanation and keeps answer hidden until the learner reveals it', async () => {
    const user = userEvent.setup();
    renderWorkspace({ mode: 'grammar', text: grammarResult.originalText, result: grammarResult });

    expect(screen.getByText('Use the past form for a completed action.')).toBeInTheDocument();
    const practice = screen.getByRole('group', { name: 'Bài tập củng cố' });
    expect(practice).toHaveTextContent('I ___ yesterday.');
    expect(practice).not.toHaveTextContent('Went is the past form of go.');
    await user.click(screen.getByRole('button', { name: 'Xem đáp án và giải thích' }));
    expect(practice).toHaveTextContent('Went is the past form of go.');
  });

  it('exposes loading and retryable provider failure states', () => {
    const onRetry = vi.fn();
    renderWorkspace({ isLoading: true, error: 'AI provider is currently offline', onRetry });

    expect(screen.getByRole('status')).toHaveTextContent('Đang phân tích');
    expect(screen.getByRole('alert')).toHaveTextContent('AI provider is currently offline');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
