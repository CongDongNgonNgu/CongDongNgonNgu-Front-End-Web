import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SpeakingRoomPageView } from './SpeakingRoomPage';
import type { SpeakingRoomClient, SpeakingRoomParticipant, SpeakingRoomSummary } from '../room.types';

afterEach(cleanup);

const room: SpeakingRoomSummary = {
  id: 'room-1',
  languageCode: 'en',
  level: 'B1',
  topic: 'Kể về một chuyến đi đáng nhớ',
  visibility: 'PUBLIC',
  lifecycle: 'LIVE',
  capacity: 20,
  participantCount: 3,
  speakerCount: 2,
  listenerCount: 1,
  isHost: false,
  isModerator: false,
  mediaProvider: { id: 'disabled', state: 'DISABLED' },
  scheduledAt: null,
  startedAt: '2026-10-01T03:00:00.000Z',
  createdAt: '2026-10-01T02:50:00.000Z',
};

const ownListener: SpeakingRoomParticipant = {
  participantId: 'participant-own',
  displayName: 'Minh',
  role: 'LISTENER',
  state: 'PRESENT',
  muted: false,
  joinedAt: '2026-10-01T03:01:00.000Z',
  lastSeenAt: '2026-10-01T03:05:00.000Z',
  reconnectLeaseUntil: null,
};

const host: SpeakingRoomParticipant = {
  participantId: 'participant-host',
  displayName: 'Lan',
  role: 'HOST',
  state: 'PRESENT',
  muted: false,
  joinedAt: '2026-10-01T03:00:00.000Z',
  lastSeenAt: null,
  reconnectLeaseUntil: null,
};

function createApi(overrides: Partial<SpeakingRoomClient> = {}): SpeakingRoomClient {
  return {
    getRoom: vi.fn().mockResolvedValue(room),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    heartbeat: vi.fn(),
    listParticipants: vi.fn().mockResolvedValue({ participants: [host, ownListener], counts: { participantCount: 2, speakerCount: 1, listenerCount: 1 } }),
    raiseHand: vi.fn().mockResolvedValue({ items: [] }),
    cancelHand: vi.fn().mockResolvedValue({ items: [] }),
    listQueue: vi.fn().mockResolvedValue({ items: [{ queueEntryId: 'queue-1', participantId: 'participant-own', displayName: 'Minh', state: 'WAITING', position: 2, requestedAt: '2026-10-01T03:04:00.000Z' }] }),
    decideQueue: vi.fn(),
    promoteParticipant: vi.fn(),
    demoteParticipant: vi.fn(),
    muteParticipant: vi.fn(),
    unmuteParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    blockParticipant: vi.fn(),
    unblockParticipant: vi.fn(),
    reportParticipant: vi.fn(),
    listChat: vi.fn().mockResolvedValue({ items: [{ id: 'message-1', displayName: 'Lan', body: '<strong>không phải HTML</strong>', own: false, createdAt: '2026-10-01T03:04:00.000Z' }], nextCursor: null }),
    sendChat: vi.fn(),
    issueMediaSession: vi.fn(),
    ...overrides,
  };
}

function renderView(api: SpeakingRoomClient, props: Partial<Parameters<typeof SpeakingRoomPageView>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SpeakingRoomPageView api={api} roomId='room-1' authenticated userDisplayName='Minh' {...props} />
    </MemoryRouter>,
  );
}

describe('SpeakingRoomPageView', () => {
  it('renders server-projected roles, safe plain-text chat, queue state and provider-safe audio controls', async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderView(api);

    expect(await screen.findByRole('heading', { name: room.topic })).toBeVisible();
    expect(screen.getByText('Server-projected')).toBeVisible();
    expect(await screen.findByText('<strong>không phải HTML</strong>')).toBeVisible();
    expect(screen.getByText('Nhà cung cấp âm thanh chưa sẵn sàng')).toBeVisible();
    expect(await screen.findByRole('button', { name: /Hủy giơ tay/ })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Hủy giơ tay/ }));
    await waitFor(() => expect(api.cancelHand).toHaveBeenCalledWith('room-1', expect.any(String), undefined));
    expect(screen.getByText('Âm thanh là tạm thời.')).toBeVisible();
  });

  it('does not request protected presence for a guest and keeps the join action behind login', async () => {
    const api = createApi();
    renderView(api, { authenticated: false, authLoading: false, userDisplayName: undefined });

    expect(await screen.findByRole('heading', { name: room.topic })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
    expect(api.listParticipants).not.toHaveBeenCalled();
  });

  it('offers an in-memory private access form without placing the token in a URL', async () => {
    const privateRoomApi = createApi();
    vi.mocked(privateRoomApi.getRoom)
      .mockRejectedValueOnce({ code: 'ROOM_NOT_FOUND' })
      .mockResolvedValueOnce(room);
    const user = userEvent.setup();
    renderView(privateRoomApi);

    expect(await screen.findByRole('heading', { name: 'Cần mã truy cập để mở phòng' })).toBeVisible();
    await user.type(screen.getByLabelText('Mã truy cập'), 'room-secret');
    await user.click(screen.getByRole('button', { name: 'Mở phòng' }));
    await waitFor(() => expect(privateRoomApi.getRoom).toHaveBeenLastCalledWith('room-1', { accessToken: 'room-secret', authenticated: true }));
    expect(window.location.href).not.toContain('room-secret');
  });
});
