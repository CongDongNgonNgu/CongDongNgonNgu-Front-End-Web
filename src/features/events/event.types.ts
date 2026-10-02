export type EventPublicState = 'UPCOMING' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type EventStateFilter = 'ALL' | EventPublicState;
export type EventVisibility = 'PUBLIC' | 'PRIVATE';
export type EventVenueType = 'SPEAKING_ROOM' | 'EXTERNAL' | 'PHYSICAL';
export type EventStatus = 'SCHEDULED' | 'CANCELLED';
export type EventRegistrationStatus = 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';

export interface EventRecurrence {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  count: number | null;
  until: string | null;
  byWeekday: string[];
}

export interface EventPublicSummary {
  id: string;
  hostUserId: string;
  title: string;
  languageCode: string;
  level: string | null;
  topic: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity: number;
  visibility: EventVisibility;
  venueType: EventVenueType;
  speakingRoomId: string | null;
  recurrenceSeriesId: string | null;
  recurrence: EventRecurrence | null;
  status: EventStatus;
  cancelledAt: string | null;
  state: EventPublicState;
  isHost: boolean;
}

export interface EventRegistrationResponse {
  id: string;
  eventId: string;
  status: EventRegistrationStatus;
  waitlistPosition: number | null;
  registeredAt: string;
  cancelledAt: string | null;
}
