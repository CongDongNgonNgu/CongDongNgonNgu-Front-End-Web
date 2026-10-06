import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

describe('homepage hash navigation', () => {
  it('scrolls to the section when a router CTA is activated, including repeat navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    const section = document.getElementById('how-it-works')!;
    const scroll = vi.fn();
    section.scrollIntoView = scroll;
    const link = screen.getByRole('link', { name: 'Xem cách bắt đầu' });
    await user.click(link);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(window.location.hash).toBe('#how-it-works');
    expect(link).toHaveFocus();
    scroll.mockClear();
    await user.click(link);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });

  it('scrolls to community when its CTA is activated with the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    const section = document.getElementById('community')!;
    const scroll = vi.fn();
    section.scrollIntoView = scroll;
    const link = screen.getByRole('link', { name: 'Khám phá cộng đồng' });
    link.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(window.location.hash).toBe('#community');
    expect(link).toHaveFocus();
  });

  it('scrolls to the community section on direct hash entry', async () => {
    const scroll = vi.fn();
    window.history.pushState({}, '', '/#community');
    render(<App />);
    const section = document.getElementById('community')!;
    section.scrollIntoView = scroll;
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(scroll.mock.instances).toContain(section);
  });

  it('ignores missing and malformed hash targets', () => {
    for (const hash of ['#missing-section', '#%']) {
      window.history.pushState({}, '', `/${hash}`);
      expect(() => render(<App />)).not.toThrow();
      cleanup();
    }
  });
});
