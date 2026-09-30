export type LearningXpSourceType =
  | 'PRACTICE_COMPLETED'
  | 'LEARNING_SESSION_COMPLETED'
  | 'VOCABULARY_MILESTONE'
  | 'QUIZ_MILESTONE';

export interface LearningMilestone {
  kind: 'XP' | 'STREAK';
  threshold: number;
  achievedOn: string;
}

export interface LearningActivitySummary {
  sourceType: LearningXpSourceType;
  xp: number;
  completedAt: string;
}

export interface LearningProgress {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  streakTimezone: string;
  activeDays: string[];
  milestones: LearningMilestone[];
  recentQualifyingActivity: LearningActivitySummary[];
}

export type ContributorBadgeStatus = 'LOCKED' | 'EARNED' | 'REVOKED';

export interface ContributorLevel {
  id: string;
  title: string;
  minReputation: number;
  nextLevel: {
    id: string;
    title: string;
    minReputation: number;
  } | null;
}

export interface ContributorBadge {
  id: string;
  title: string;
  description: string;
  threshold: number;
  status: ContributorBadgeStatus;
  awardedAt: string | null;
  revokedAt: string | null;
}

export interface CommunityReputationProgress {
  communityReputation: number;
  contributorLevel: ContributorLevel;
  badges: ContributorBadge[];
  activeContributionCount: number;
}

export interface PassportProgressApi {
  getLearningProgress: () => Promise<LearningProgress>;
  getContributorProgress: () => Promise<CommunityReputationProgress>;
}
