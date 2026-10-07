import { ApiClientError } from "../../services/api-client";
import type { GroupRole } from "./study-groups.types";
export const canManage = (role: GroupRole) => role === "OWNER";
export const canModerate = (role: GroupRole) =>
  role === "OWNER" || role === "MODERATOR";
export const canRemove = (actor: GroupRole, target: GroupRole, self: boolean) =>
  !self &&
  target !== "OWNER" &&
  (actor === "OWNER" || (actor === "MODERATOR" && target === "MEMBER"));
export const isAccessLost = (e: unknown) =>
  e instanceof ApiClientError &&
  (e.status === 401 || e.code === "GROUP_UNAVAILABLE");
export const groupErrorKey = (e: unknown) =>
  e instanceof ApiClientError && e.code === "GROUP_RATE_LIMITED"
    ? "groups.rate"
    : e instanceof ApiClientError && e.code === "GROUP_LIMIT_REACHED"
      ? "groups.limit"
      : isAccessLost(e)
        ? "groups.unavailable"
        : "groups.error";
