export type ChallengeType =
  | 'SPEAKING'
  | 'SENTENCE_PRACTICE'
  | 'PRONUNCIATION'
  | 'VOCABULARY'
  | 'COMMUNITY';

export type ChallengeGoalUnit = 'ACTIVITIES' | 'MINUTES' | 'ITEMS';
export type ChallengePublicState = 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type ChallengePublicStateFilter = 'ALL' | ChallengePublicState;
export type ChallengeParticipationStatus = 'JOINED' | 'LEFT' | 'COMPLETED';

export interface ChallengeGoal {
  unit: ChallengeGoalUnit;
  target: number;
}

export interface ChallengePublicSummary {
  id: string;
  title: string;
  description: string;
  challengeType: ChallengeType;
  languageCode: string;
  level: string | null;
  topic: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  goal: ChallengeGoal;
  state: ChallengePublicState;
  participantCount: number;
}

export interface ChallengePublicProgress {
  status: ChallengeParticipationStatus;
  progressValue: number;
  goal: ChallengeGoal;
  completionPercent: number;
  completedAt: string | null;
}

export interface ChallengeJoinResult {
  replayed: boolean;
  participation: {
    status: ChallengeParticipationStatus;
    joinedAt: string;
    leftAt: string | null;
    completedAt: string | null;
    progressValue: number;
  };
}

export type ChallengePublicDetail = ChallengePublicSummary;
