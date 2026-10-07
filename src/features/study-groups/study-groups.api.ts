import { authApi, type AuthApi } from "../auth/auth-api";
import type {
  StudyGroup,
  GroupMember,
  GroupText,
  GroupInvite,
  IssuedInvite,
  GroupReport,
  GroupPage,
} from "./study-groups.types";
const id = encodeURIComponent;
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined
    ? {}
    : {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
});
export class StudyGroupsApi {
  constructor(private client: Pick<AuthApi, "requestProtected"> = authApi) {}
  private page<T>(path: string, page = 1, limit = 20) {
    return this.client.requestProtected<GroupPage<T>>(
      "/study-groups" +
        path +
        "?" +
        new URLSearchParams({
          page: String(Math.max(1, page)),
          limit: String(Math.min(20, Math.max(1, limit))),
        }),
    );
  }
  list(page = 1) {
    return this.page<StudyGroup>("", page);
  }
  create(name: string, description: string) {
    return this.client.requestProtected<StudyGroup>(
      "/study-groups",
      json("POST", { name, description }),
    );
  }
  get(groupId: string) {
    return this.client.requestProtected<StudyGroup>(
      "/study-groups/" + id(groupId),
    );
  }
  members(g: string, page = 1, limit = 20) {
    return this.page<GroupMember>("/" + id(g) + "/members", page, limit);
  }
  texts(g: string, page = 1) {
    return this.page<GroupText>("/" + id(g) + "/texts", page);
  }
  invitations(g: string, page = 1) {
    return this.page<GroupInvite>("/" + id(g) + "/invitations", page);
  }
  reports(g: string, page = 1) {
    return this.page<GroupReport>("/" + id(g) + "/reports", page);
  }
  issue(g: string) {
    return this.client.requestProtected<IssuedInvite>(
      "/study-groups/" + id(g) + "/invitations",
      json("POST"),
    );
  }
  accept(groupId: string, token: string) {
    return this.client.requestProtected<StudyGroup>(
      "/study-groups/invitations/accept",
      json("POST", { groupId, token }),
    );
  }
  revoke(g: string, i: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/invitations/" + id(i),
      json("DELETE"),
    );
  }
  leave(g: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/leave",
      json("POST"),
    );
  }
  remove(g: string, u: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/members/" + id(u),
      json("DELETE"),
    );
  }
  role(g: string, u: string, role: "MEMBER" | "MODERATOR") {
    return this.client.requestProtected<GroupMember>(
      "/study-groups/" + id(g) + "/members/" + id(u) + "/role",
      json("PATCH", { role }),
    );
  }
  transfer(g: string, userId: string) {
    return this.client.requestProtected<StudyGroup>(
      "/study-groups/" + id(g) + "/ownership",
      json("POST", { userId }),
    );
  }
  archive(g: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/archive",
      json("POST"),
    );
  }
  write(g: string, body: string) {
    return this.client.requestProtected<GroupText>(
      "/study-groups/" + id(g) + "/texts",
      json("POST", { body }),
    );
  }
  hide(g: string, t: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/texts/" + id(t) + "/hide",
      json("POST"),
    );
  }
  report(g: string, t: string, reason: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/texts/" + id(t) + "/reports",
      json("POST", { reason }),
    );
  }
  resolve(g: string, r: string) {
    return this.client.requestProtected(
      "/study-groups/" + id(g) + "/reports/" + id(r) + "/resolve",
      json("POST"),
    );
  }
}
