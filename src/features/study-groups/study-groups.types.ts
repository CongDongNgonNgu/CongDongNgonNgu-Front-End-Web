import type {
  MessageContextCard,
  MessageContextType,
} from "../communication/context.types";
export type GroupRole = "OWNER" | "MODERATOR" | "MEMBER";
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  visibility: "PRIVATE_INVITE_ONLY";
  status: "ACTIVE" | "ARCHIVED";
  role: GroupRole;
  createdAt: string;
  updatedAt: string;
}
export interface GroupMember {
  userId: string;
  displayName: string;
  role: GroupRole;
  joinedAt: string;
}
export interface GroupText {
  sequence?: string;
  context?: MessageContextCard | null;
  id: string;
  body: string;
  author: { userId: string; displayName: string };
  hidden: boolean;
  createdAt: string;
}
export interface GroupInvite {
  id: string;
  createdAt: string;
  expiresAt: string;
  state: "UNUSED" | "EXPIRED" | "REVOKED" | "ACCEPTED";
}
export interface IssuedInvite {
  id: string;
  token: string;
  expiresAt: string;
}
export interface GroupReport {
  id: string;
  textId: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
}
export interface GroupPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface GroupWriteInput {
  body?: string;
  clientMessageId?: string;
  contextType?: MessageContextType;
  contextId?: string;
}
export interface GroupSyncInput {
  cursor?: string;
  renderedIds?: string[];
  limit?: number;
}
export interface GroupSyncPage {
  groupRole: GroupRole;
  groupStatus: "ACTIVE";
  items: GroupText[];
  stillVisibleIds: string[];
  hiddenIds?: string[];
  cursor: string;
  nextCursor: string | null;
  hasMore: boolean;
  version: string;
  unreadCount: number | string;
  lastReadSequence: string;
}
export interface GroupReadState {
  unreadCount: number | string;
  lastReadSequence: string;
}
