import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import type { EventApi } from '../event.api';
import type { EventPublicSummary, EventRegistrationResponse } from '../event.types';
import { EventDetailPageView } from './EventDetailPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const event = createEvent();

describe('EventDetailPage', () => {
  it('lets a guest understand the event and sends them to login for registration', async () => {
    const api = createApi();
    renderPage(api, 'unauthenticated');

    expect(await screen.findByRole('heading', { name: 'English Coffee Talk' })).toBeVisible();
    expect(screen.getByText('Chủ đề: Everyday conversation')).toBeVisible();
    expect(screen.getByText('Giờ địa phương của sự kiện · Asia/Ho_Chi_Minh')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đăng nhập để đăng ký' })).toHaveAttribute('href', '/login');
    expect(api.getRegistration).not.toHaveBeenCalled();
  });

  it('registers and cancels through the protected server action', async () => {
    const user = userEvent.setup();
    let registration: EventRegistrationResponse | null = null;
    const api = createApi({
      getRegistration: vi.fn(async () => {
        if (!registration) throw new ApiClientError('missing', 404, 'EVENT_REGISTRATION_NOT_FOUND');
        return registration;
      }),
      register: vi.fn(async () => {
        registration = createRegistration({ status: 'REGISTERED' });
        return registration;
      }),
      cancelRegistration: vi.fn(async () => {
        registration = createRegistration({ status: 'CANCELLED', cancelledAt: '2026-10-02T00:00:00.000Z' });
        return registration;
      }),
    });
    renderPage(api, 'authenticated');

    await user.click(await screen.findByRole('button', { name: 'Đăng ký tham gia' }));
    await waitFor(() => expect(api.register).toHaveBeenCalledWith(event.id));
    expect(await screen.findByText('Đã đăng ký')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hủy đăng ký' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Hủy đăng ký' }));
    await waitFor(() => expect(api.cancelRegistration).toHaveBeenCalledWith(event.id));
    expect(await screen.findByText('Đã hủy đăng ký')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đăng ký tham gia' })).toBeVisible();
  });

  it('shows waitlist position and does not offer writes for a past event', async () => {
    const waitlisted = createRegistration({ status: 'WAITLISTED', waitlistPosition: 3 });
    const api = createApi({ getRegistration: vi.fn(async () => waitlisted) });
    renderPage(api, 'authenticated');

    expect(await screen.findByText('Đang ở danh sách chờ')).toBeVisible();
    expect(screen.getByText('Vị trí danh sách chờ: 3')).toBeVisible();

    const pastApi = createApi({
      get: vi.fn(async () => createEvent({ state: 'ENDED' })),
      getRegistration: vi.fn(async () => createRegistration({ status: 'REGISTERED' })),
    });
    cleanup();
    renderPage(pastApi, 'authenticated');

    expect(await screen.findByText('Sự kiện đã kết thúc. Thông tin vẫn được giữ để tham khảo.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Đăng ký tham gia' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đăng ký' })).not.toBeInTheDocument();
  });

  it('keeps a cancelled event readable without registration writes', async () => {
    const api = createApi({
      get: vi.fn(async () => createEvent({ state: 'CANCELLED', status: 'CANCELLED' })),
    });
    renderPage(api, 'authenticated');

    expect(await screen.findByText('Đã hủy')).toBeVisible();
    expect(await screen.findByText('Sự kiện này đã được hủy. Không thể đăng ký mới.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Đăng ký tham gia' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đăng ký' })).not.toBeInTheDocument();
  });

  it('keeps private event access failure bounded and does not leak server details', async () => {
    const api = createApi({ get: vi.fn().mockRejectedValue(new ApiClientError('not found', 404, 'EVENT_NOT_FOUND')) });
    renderPage(api, 'authenticated');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải sự kiện');
    expect(screen.queryByText('not found')).not.toBeInTheDocument();
  });
});

function renderPage(api: EventApi, authStatus: 'authenticated' | 'unauthenticated') {
  return render(
    <MemoryRouter>
      <EventDetailPageView api={api} authStatus={authStatus} eventId={event.id} />
    </MemoryRouter>,
  );
}

function createApi(overrides: Partial<Record<keyof EventApi, unknown>> = {}): EventApi {
  return {
    list: vi.fn(),
    get: vi.fn(async () => event),
    getRegistration: vi.fn(async () => { throw new ApiClientError('missing', 404, 'EVENT_REGISTRATION_NOT_FOUND'); }),
    register: vi.fn(async () => createRegistration({ status: 'REGISTERED' })),
    cancelRegistration: vi.fn(async () => createRegistration({ status: 'CANCELLED' })),
    getHostProfile: vi.fn(async () => ({
      scope: 'public',
      user: { id: event.hostUserId, displayName: 'Minh Anh' },
      languages: [],
      goals: [],
      skills: [],
      interests: [],
    })),
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

function createRegistration(overrides: Partial<EventRegistrationResponse> = {}): EventRegistrationResponse {
  return {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    eventId: event.id,
    status: 'REGISTERED',
    waitlistPosition: null,
    registeredAt: '2026-10-02T00:00:00.000Z',
    cancelledAt: null,
    ...overrides,
  };
}
