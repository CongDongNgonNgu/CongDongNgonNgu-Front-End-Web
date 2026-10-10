import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageTimeline } from './MessageTimeline';
import type { DirectMessage } from '../messaging.types';

afterEach(() => { cleanup();vi.unstubAllGlobals(); });
const message = (id: string): DirectMessage => ({ id, conversationId: 'room', senderUserId: 'A',
  sequence: id, clientMessageId: id, text: 'Message ' + id, createdAt: '2026-10-10T00:00:00Z' });

describe('timeline asynchronous content layout', () => {
  it('preserves the visible message when prepending also changes content below that message', () => {
    let resize!: () => void;
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    const props = { actor: 'A', partner: 'B', loading: false, hasOlder: true,
      onLoadOlder: vi.fn(), onAtLatestChange: vi.fn() };
    const view = render(<MessageTimeline {...props} messages={[message('2')]}/>);
    const viewport = screen.getByRole('log');let height = 600, top = 100, anchorPosition = 120;
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, get: () => height }, clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, get: () => top, set: (value: number) => { top = value; } },
    });
    const element = viewport.querySelector<HTMLElement>('[data-message-id="2"]')!;
    element.getBoundingClientRect = () => ({ top: anchorPosition - top, bottom: anchorPosition - top + 100 } as DOMRect);
    view.rerender(<MessageTimeline {...props} messages={[message('2')]}/>);
    top = 100;
    fireEvent.scroll(viewport);
    // The older page adds 200px above; a card below shrinks by 80px simultaneously.
    height = 720;anchorPosition = 320;
    view.rerender(<MessageTimeline {...props} messages={[message('1'), message('2')]}/>);
    expect(top).toBe(300);
    expect(element.getBoundingClientRect().top).toBe(20);
    const inserted = viewport.querySelector<HTMLElement>('[data-message-id="1"]')!;
    inserted.getBoundingClientRect = () => ({ top: 250 - top, bottom: 350 - top } as DOMRect);
    // A programmatic scroll event must not replace the reading anchor with a newly inserted row.
    fireEvent.scroll(viewport);
    anchorPosition += 60;height += 60;act(() => resize());
    expect(top).toBe(360);
    expect(element.getBoundingClientRect().top).toBe(20);
  });
  it('follows card growth at latest and excludes that growth from later older-page compensation', () => {
    let resize!: () => void;
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    const props = { actor: 'A', partner: 'B', loading: false, hasOlder: true,
      onLoadOlder: vi.fn(), onAtLatestChange: vi.fn() };
    const view = render(<MessageTimeline {...props} messages={[message('2')]}/>);
    const viewport = screen.getByRole('log');let height = 300, top = 0;
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, get: () => height }, clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, get: () => top, set: (value: number) => { top = Math.min(Math.max(value, 0), height - 100); } },
    });
    const element = viewport.querySelector<HTMLElement>('[data-message-id="2"]')!;
    element.getBoundingClientRect = () => ({ top: height - 100 - top, bottom: height - top } as DOMRect);
    view.rerender(<MessageTimeline {...props} messages={[message('2')]}/>);
    expect(top).toBe(200);
    height = 340;act(() => resize());expect(top).toBe(240);
    viewport.scrollTop = 80;fireEvent.scroll(viewport);
    height = 400;view.rerender(<MessageTimeline {...props} messages={[message('1'), message('2')]}/>);
    expect(top).toBe(140);act(() => resize());expect(top).toBe(140);
  });
});
