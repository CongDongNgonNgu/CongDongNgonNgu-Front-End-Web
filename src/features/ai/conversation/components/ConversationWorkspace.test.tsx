import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConversationWorkspace } from './ConversationWorkspace';
import { AI_ROLEPLAY_SCENARIOS, type AiConversation } from '../ai-conversation.types';

const session: AiConversation = {
  id: 'conversation-1',
  mode: 'roleplay',
  status: 'ERROR',
  responseLanguageCode: 'ja',
  learnerContext: { targetLanguage: { code: 'ja', name: 'Japanese' }, proficiency: { effective: 'B1' } },
  roleplay: {
    scenarioId: 'business-meeting',
    context: 'Trao đổi tiến độ dự án.',
    learnerRole: 'Người quản lý dự án',
    assistantRole: 'Đối tác dự án',
    targetLanguageCode: 'ja',
    proficiency: 'B1',
    objective: 'Xác nhận tiến độ.',
    tone: 'Lịch sự',
    responseStyle: 'Ngắn gọn',
    constraints: [],
    safeBoundaries: [],
    goals: ['Xác nhận thời hạn'],
  },
  turns: [{ id: 'turn-1', role: 'assistant', kind: 'response', content: '確認いたしました。', createdAt: '2026-09-30T09:42:00.000Z' }],
  goals: [{ label: 'Xác nhận thời hạn', completed: false }],
  feedback: null,
  failure: { code: 'AI_PROVIDER_UNAVAILABLE', message: 'offline' },
  createdAt: '2026-09-30T09:40:00.000Z',
  updatedAt: '2026-09-30T09:42:00.000Z',
};

afterEach(cleanup);

function renderWorkspace(overrides: Partial<React.ComponentProps<typeof ConversationWorkspace>> = {}) {
  const props: React.ComponentProps<typeof ConversationWorkspace> = {
    authenticated: true,
    mode: 'roleplay',
    session,
    scenarios: AI_ROLEPLAY_SCENARIOS,
    selectedScenarioId: 'business-meeting',
    draft: 'Xin chào',
    isLoading: false,
    isSending: false,
    isStopping: false,
    error: null,
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    onRetry: vi.fn(),
    onExplain: vi.fn(),
    onStop: vi.fn(),
    onScenarioChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<MemoryRouter><ConversationWorkspace {...props} /></MemoryRouter>), props };
}

describe('ConversationWorkspace', () => {
  it('exposes the reusable roleplay path, goals and provider-offline retry state', () => {
    const { props } = renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Đối thoại theo tình huống' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Đổi kịch bản')).toHaveLength(2);
    expect(screen.getAllByText('Xác nhận thời hạn')).not.toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('AI đang ngoại tuyến');
    fireEvent.click(screen.getByRole('button', { name: 'Giải thích câu này' }));
    expect(props.onExplain).toHaveBeenCalledWith('turn-1');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('keeps Enter sendable while Shift+Enter remains a newline gesture', () => {
    const onSend = vi.fn();
    renderWorkspace({ session: { ...session, status: 'ACTIVE' }, onSend });
    const composer = screen.getByLabelText('Soạn câu trả lời bằng Japanese');
    expect(composer).not.toBeDisabled();
    expect(screen.getAllByRole('button', { name: /Gửi lời thoại/ })[0]).not.toBeDisabled();
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
