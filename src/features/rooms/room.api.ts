import type { AuthApi } from '../auth/auth-api';
import type {
  SpeakingRoomApiTransport,
  SpeakingRoomBlockResult,
  SpeakingRoomChat,
  SpeakingRoomChatMessage,
  SpeakingRoomClient,
  SpeakingRoomJoinResult,
  SpeakingRoomMediaSession,
  SpeakingRoomModerationResult,
  SpeakingRoomPresence,
  SpeakingRoomQueue,
  SpeakingRoomQueueDecisionResult,
  SpeakingRoomReportCategory,
  SpeakingRoomReportResult,
  SpeakingRoomSummary,
} from './room.types';

export class SpeakingRoomApi implements SpeakingRoomClient {
  constructor(private readonly transport: SpeakingRoomApiTransport) {}

  getRoom(roomId: string, options: { accessToken?: string; authenticated?: boolean } = {}): Promise<SpeakingRoomSummary> {
    return this.requestRead<SpeakingRoomSummary>(`/rooms/${encodeURIComponent(roomId)}`, options);
  }

  joinRoom(roomId: string, input: { requestId: string; deviceId: string; participantId?: string | null }, accessToken?: string): Promise<SpeakingRoomJoinResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/join`, 'POST', input, accessToken);
  }

  leaveRoom(roomId: string, input: { requestId: string; participantId: string; mode?: 'VOLUNTARY' | 'DISCONNECT' }, accessToken?: string): Promise<SpeakingRoomJoinResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/leave`, 'POST', input, accessToken);
  }

  heartbeat(roomId: string, input: { requestId: string; participantId: string }, accessToken?: string): Promise<SpeakingRoomJoinResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/presence/heartbeat`, 'POST', input, accessToken);
  }

  listParticipants(roomId: string, accessToken?: string): Promise<SpeakingRoomPresence> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/participants`, 'GET', undefined, accessToken);
  }

  raiseHand(roomId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomQueue> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/queue/raise-hand`, 'POST', { requestId }, accessToken);
  }

  cancelHand(roomId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomQueue> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/queue/cancel`, 'POST', { requestId }, accessToken);
  }

  listQueue(roomId: string, accessToken?: string): Promise<SpeakingRoomQueue> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/queue`, 'GET', undefined, accessToken);
  }

  decideQueue(roomId: string, queueEntryId: string, input: { requestId: string; decision: 'ACCEPT' | 'DECLINE' }, accessToken?: string): Promise<SpeakingRoomQueueDecisionResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/queue/${encodeURIComponent(queueEntryId)}/decision`, 'POST', input, accessToken);
  }

  promoteParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult> {
    return this.moderate(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/promote`, requestId, accessToken);
  }

  demoteParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult> {
    return this.moderate(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/demote`, requestId, accessToken);
  }

  muteParticipant(roomId: string, participantId: string, input: { requestId: string; durationSeconds?: number }, accessToken?: string): Promise<SpeakingRoomModerationResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/mute`, 'POST', input, accessToken);
  }

  unmuteParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult> {
    return this.moderate(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/unmute`, requestId, accessToken);
  }

  removeParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult> {
    return this.moderate(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/remove`, requestId, accessToken);
  }

  blockParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomBlockResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/block`, 'POST', { requestId }, accessToken);
  }

  unblockParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomBlockResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/unblock`, 'POST', { requestId }, accessToken);
  }

  reportParticipant(roomId: string, participantId: string, input: { requestId: string; category: SpeakingRoomReportCategory; details?: string | null }, accessToken?: string): Promise<SpeakingRoomReportResult> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}/report`, 'POST', input, accessToken);
  }

  listChat(roomId: string, options: { limit?: number; cursor?: string; accessToken?: string } = {}): Promise<SpeakingRoomChat> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.cursor) params.set('cursor', options.cursor);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/chat${suffix}`, 'GET', undefined, options.accessToken);
  }

  sendChat(roomId: string, input: { requestId: string; content: string }, accessToken?: string): Promise<SpeakingRoomChatMessage> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/chat`, 'POST', input, accessToken);
  }

  issueMediaSession(roomId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomMediaSession> {
    return this.requestProtected(`/rooms/${encodeURIComponent(roomId)}/media-session`, 'POST', { requestId }, accessToken);
  }

  private moderate(path: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult> {
    return this.requestProtected(path, 'POST', { requestId }, accessToken);
  }

  private requestRead<T>(path: string, options: { accessToken?: string; authenticated?: boolean }): Promise<T> {
    const init = options.accessToken ? { headers: roomAccessHeaders(options.accessToken) } : {};
    return options.authenticated
      ? this.transport.requestProtected<T>(path, init)
      : this.transport.requestPublic<T>(path, init);
  }

  private requestProtected<T>(path: string, method: 'GET' | 'POST', body: object | undefined, accessToken?: string): Promise<T> {
    return this.transport.requestProtected<T>(path, {
      method,
      ...(accessToken ? { headers: roomAccessHeaders(accessToken) } : {}),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
}

export function createSpeakingRoomApi(auth: Pick<AuthApi, 'requestPublic' | 'requestProtected'>): SpeakingRoomApi {
  return new SpeakingRoomApi(auth);
}

function roomAccessHeaders(accessToken?: string): HeadersInit {
  return accessToken ? { 'X-Room-Access-Token': accessToken } : {};
}
