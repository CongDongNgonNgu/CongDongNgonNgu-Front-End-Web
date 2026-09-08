import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('final human-first homepage narrative', () => {
  it('renders the required product sections and language ecosystem', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /vòng lặp học tập cộng đồng/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /thư viện ngôn ngữ mở/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /ngôn ngữ của bạn thuộc về thế giới/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /practice with ai\. learn with people\./i })).toBeVisible();
    expect(screen.getByText(/khi cộng đồng sẵn sàng/i)).toBeVisible();
    expect(screen.getByRole('heading', { name: /cộng đồng miễn phí trước tiên/i })).toBeVisible();

    const languageRegion = within(screen.getByRole('region', { name: /bắt đầu từ ngôn ngữ/i }));
    for (const language of ['Tiếng Việt', 'English', '中文', '日本語', '한국어', 'Français', 'Deutsch', 'Español']) {
      expect(languageRegion.getByText(language, { exact: true })).toBeVisible();
    }

    for (const loopStep of ['Learn', 'Ask', 'Practice', 'Correct', 'Share', 'Help someone else']) {
      expect(screen.getByText(loopStep, { exact: true })).toBeVisible();
    }

    expect(screen.queryByText(/tiếng việt cho thế giới/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/người nói tiếng việt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/người nói english/i)).not.toBeInTheDocument();
  });
});
