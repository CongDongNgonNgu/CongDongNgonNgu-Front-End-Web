export type GroupRole = "OWNER" | "MODERATOR" | "MEMBER";
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
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
