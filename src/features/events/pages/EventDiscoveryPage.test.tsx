import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { EventApi } from '../event.api';
import type { EventPublicSummary } from '../event.types';
import { EventDiscoveryPageView } from './EventDiscoveryPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const event = createEvent();

describe('EventDiscoveryPage', () => {
  it('renders backend event facts, timezone clarity and detail links', async () => {
    renderPage(createApi(), 'unauthenticated');

    expect(await screen.findByRole('heading', { name: 'English Coffee Talk' })).toBeVisible();
    expect(screen.getAllByText('Sắp diễn ra').some((element) => element.tagName === 'SPAN')).toBe(true);
    expect(screen.getByText('Giờ địa phương của sự kiện · Asia/Ho_Chi_Minh')).toBeVisible();
    expect(screen.getByText('Giới hạn 12 người')).toBeVisible();
    expect(screen.getByRole('link', { name: /Xem chi tiết English Coffee Talk/i })).toHaveAttribute(
      'href',
      `/events/${event.id}`,
    );
  });

  it('filters the chronological list by search without inventing event state', async () => {
    const user = userEvent.setup();
    const second = createEvent({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'Beginner Japanese Room', languageCode: 'ja' });
    renderPage(createApi({ list: vi.fn(async () => [event, second]) }), 'unauthenticated');

    const search = await screen.findByRole('searchbox', { name: 'Tìm sự kiện' });
    await user.type(search, 'Japanese');

    expect(screen.getByRole('heading', { name: 'Beginner Japanese Room' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'English Coffee Talk' })).not.toBeInTheDocument();
  });

  it('shows a truthful retry state when the event list is unavailable', async () => {
    renderPage(createApi({ list: vi.fn().mockRejectedValue(new Error('offline')) }), 'unauthenticated');

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được danh sách sự kiện');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  });

  it('keeps an empty filtered list understandable', async () => {
    const user = userEvent.setup();
    renderPage(createApi(), 'unauthenticated');

    await user.type(await screen.findByRole('searchbox', { name: 'Tìm sự kiện' }), 'không có');

    expect(screen.getByRole('status')).toHaveTextContent('Chưa có sự kiện phù hợp');
  });
});

function renderPage(api: EventApi, authStatus: 'authenticated' | 'unauthenticated') {
  return render(
    <MemoryRouter>
      <EventDiscoveryPageView api={api} authStatus={authStatus} />
    </MemoryRouter>,
  );
}

function createApi(overrides: Partial<Record<keyof EventApi, unknown>> = {}): EventApi {
  return {
    list: vi.fn(async () => [event]),
    get: vi.fn(async () => event),
    getRegistration: vi.fn(),
    register: vi.fn(),
    cancelRegistration: vi.fn(),
    getHostProfile: vi.fn(),
    ...overrides,
  } as EventApi;
}

function createEvent(overrides: Partial<EventPublicSummary> = {}): EventPublicSummary {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    hostUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    title: 'English Coffee Talk',
    languageCode: 'en',
    level: 'A2',
    topic: 'Everyday conversation',
    startAt: '2026-10-03T13:00:00.000Z',
    endAt: '2026-10-03T14:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    capacity: 12,
    visibility: 'PUBLIC',
    venueType: 'SPEAKING_ROOM',
    speakingRoomId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    recurrenceSeriesId: null,
    recurrence: null,
    status: 'SCHEDULED',
    cancelledAt: null,
    state: 'UPCOMING',
    isHost: false,
    ...overrides,
  };
}
