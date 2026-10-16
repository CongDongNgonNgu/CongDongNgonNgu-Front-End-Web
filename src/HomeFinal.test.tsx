import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  localStorage.removeItem('congdongngonngu.ui-locale.v1');
  window.history.pushState({}, '', '/');
});

describe('final human-first homepage narrative', () => {
  it('renders the required product sections and language ecosystem', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Học ngôn ngữ cùng nhau.' })).toBeVisible();
    expect(screen.getByText('Một cộng đồng mở để học cùng con người, thực hành với AI và xây dựng tri thức ngôn ngữ.')).toBeVisible();
    expect(screen.getByText('Từ người mới bắt đầu đến người muốn chia sẻ điều mình biết.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Xem cách bắt đầu' })).toHaveAttribute('href', '/#how-it-works');
    expect(screen.getByRole('link', { name: 'Khám phá cộng đồng' })).toHaveAttribute('href', '/community');
    expect(screen.getByRole('img', { name: /cộng đồng đa ngôn ngữ/i }).getAttribute('src')).toMatch(/language-community-hero-v2[.]jpg/);
    expect(screen.getByRole('heading', { name: /vòng lặp học tập cộng đồng/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /thư viện ngôn ngữ mở/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /ngôn ngữ của bạn thuộc về thế giới/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /practice with ai\. learn with people\./i })).toBeVisible();
    expect(screen.getByText('CÙNG HỌC QUA TRÒ CHUYỆN')).toBeVisible();
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

  it('uses router links for homepage section CTAs', async () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Xem cách bắt đầu' })).toHaveAttribute('href', '/#how-it-works');
    expect(screen.getByRole('link', { name: 'Khám phá cộng đồng' })).toHaveAttribute('href', '/community');
    expect(screen.getByRole('link', { name: 'Khám phá ngôn ngữ' })).toHaveAttribute('href', '/languages');
    expect(screen.getByRole('link', { name: 'Tìm hiểu cách đóng góp' })).toHaveAttribute('href', '/community');
  });
});

it('localizes affected Explore CTAs while keeping real product destinations', () => {
 localStorage.setItem('congdongngonngu.ui-locale.v1','en');
 render(<App/>);
 expect(screen.getByRole('link',{name:'Explore the community'})).toHaveAttribute('href','/community');
 expect(screen.getByRole('link',{name:'Explore languages'})).toHaveAttribute('href','/languages');
 expect(screen.getByRole('link',{name:'Learn how to contribute'})).toHaveAttribute('href','/community');
 expect(within(document.getElementById('exchange')!).getByRole('link',{name:'Find a study partner'})).toHaveAttribute('href','/exchange');
 expect(screen.queryByText(/connections will open later/i)).toBeNull();
});
