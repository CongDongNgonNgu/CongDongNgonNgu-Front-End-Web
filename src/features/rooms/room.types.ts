export type SpeakingRoomVisibility = 'PUBLIC' | 'PRIVATE';
export type SpeakingRoomLifecycle = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type SpeakingRoomProviderState = 'AVAILABLE' | 'DISABLED' | 'OUTAGE' | string;
export type SpeakingRoomParticipantRole = 'LISTENER' | 'SPEAKER' | 'HOST' | 'MODERATOR';
export type SpeakingRoomParticipantState = 'PRESENT' | 'DISCONNECTED' | 'LEFT' | 'REMOVED';
export type SpeakingRoomQueueState = 'WAITING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
export type SpeakingRoomReportCategory = 'HARASSMENT' | 'SPAM' | 'HATE' | 'SEXUAL_CONTENT' | 'OTHER';

export interface SpeakingRoomSummary {
  id: string;
  languageCode: string;
  level: string | null;
  topic: string;
  visibility: SpeakingRoomVisibility;
  lifecycle: SpeakingRoomLifecycle;
  capacity: number;
  participantCount: number;
  speakerCount: number;
  listenerCount: number;
  isHost: boolean;
  isModerator: boolean;
  mediaProvider: {
    id: string;
    state: SpeakingRoomProviderState;
  };
  scheduledAt: string | null;
  startedAt: string | null;
  createdAt: string;
}

export interface SpeakingRoomParticipant {
  participantId: string | null;
  displayName: string;
  role: SpeakingRoomParticipantRole;
  state: SpeakingRoomParticipantState;
  muted: boolean;
  joinedAt: string;
  lastSeenAt: string | null;
  reconnectLeaseUntil: string | null;
}

export interface SpeakingRoomCounts {
  participantCount: number;
  speakerCount: number;
  listenerCount: number;
}

export interface SpeakingRoomPresence {
  participants: SpeakingRoomParticipant[];
  counts: SpeakingRoomCounts;
}

export interface SpeakingRoomQueueItem {
  queueEntryId: string | null;
  participantId: string | null;
  displayName: string;
  state: SpeakingRoomQueueState;
  position: number | null;
  requestedAt: string;
}

export interface SpeakingRoomQueue {
  items: SpeakingRoomQueueItem[];
  replayed?: boolean;
}

export interface SpeakingRoomChatMessage {
  id: string;
  displayName: string;
  body: string;
  own: boolean;
  createdAt: string;
}

export interface SpeakingRoomChat {
  items: SpeakingRoomChatMessage[];
  nextCursor: string | null;
}

export interface SpeakingRoomJoinResult {
  participant: SpeakingRoomParticipant;
  counts: SpeakingRoomCounts;
}

export interface SpeakingRoomMediaSession {
  roomId: string;
  role: SpeakingRoomParticipantRole;
  providerId: string;
  providerState: SpeakingRoomProviderState;
  providerSessionId: string;
  token: string;
  expiresAt: string;
}

export interface SpeakingRoomModerationResult {
  participant: SpeakingRoomParticipant;
  action: string;
  replayed: boolean;
}

export interface SpeakingRoomBlockResult {
  blocked: boolean;
  replayed: boolean;
}

export interface SpeakingRoomReportResult {
  scope: 'room-report';
  submitted: true;
  replayed: boolean;
}

export interface SpeakingRoomQueueDecisionResult {
  queueEntry: SpeakingRoomQueueItem;
  participant: SpeakingRoomParticipant;
  replayed: boolean;
}

export interface SpeakingRoomApiTransport {
  requestPublic<T>(path: string, init?: RequestInit): Promise<T>;
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface SpeakingRoomClient {
  getRoom(roomId: string, options?: { accessToken?: string; authenticated?: boolean }): Promise<SpeakingRoomSummary>;
  joinRoom(roomId: string, input: { requestId: string; deviceId: string; participantId?: string | null }, accessToken?: string): Promise<SpeakingRoomJoinResult>;
  leaveRoom(roomId: string, input: { requestId: string; participantId: string; mode?: 'VOLUNTARY' | 'DISCONNECT' }, accessToken?: string): Promise<SpeakingRoomJoinResult>;
  heartbeat(roomId: string, input: { requestId: string; participantId: string }, accessToken?: string): Promise<SpeakingRoomJoinResult>;
  listParticipants(roomId: string, accessToken?: string): Promise<SpeakingRoomPresence>;
  raiseHand(roomId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomQueue>;
  cancelHand(roomId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomQueue>;
  listQueue(roomId: string, accessToken?: string): Promise<SpeakingRoomQueue>;
  decideQueue(roomId: string, queueEntryId: string, input: { requestId: string; decision: 'ACCEPT' | 'DECLINE' }, accessToken?: string): Promise<SpeakingRoomQueueDecisionResult>;
  promoteParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult>;
  demoteParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult>;
  muteParticipant(roomId: string, participantId: string, input: { requestId: string; durationSeconds?: number }, accessToken?: string): Promise<SpeakingRoomModerationResult>;
  unmuteParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult>;
  removeParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomModerationResult>;
  blockParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomBlockResult>;
  unblockParticipant(roomId: string, participantId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomBlockResult>;
  reportParticipant(roomId: string, participantId: string, input: { requestId: string; category: SpeakingRoomReportCategory; details?: string | null }, accessToken?: string): Promise<SpeakingRoomReportResult>;
  listChat(roomId: string, options?: { limit?: number; cursor?: string; accessToken?: string }): Promise<SpeakingRoomChat>;
  sendChat(roomId: string, input: { requestId: string; content: string }, accessToken?: string): Promise<SpeakingRoomChatMessage>;
  issueMediaSession(roomId: string, requestId: string, accessToken?: string): Promise<SpeakingRoomMediaSession>;
}
