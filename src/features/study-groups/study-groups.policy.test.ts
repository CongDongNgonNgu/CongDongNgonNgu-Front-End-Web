import { describe, it, expect } from "vitest";
import {
  canRemove,
  canManage,
  canModerate,
  isAccessLost,
} from "./study-groups.policy";
import { ApiClientError } from "../../services/api-client";
describe("group UI capability boundary", () => {
  it("limits moderator removal to other ordinary members", () => {
    expect(canRemove("MODERATOR", "MEMBER", false)).toBe(true);
    for (const role of ["OWNER", "MODERATOR"] as const)
      expect(canRemove("MODERATOR", role, false)).toBe(false);
    expect(canRemove("MODERATOR", "MEMBER", true)).toBe(false);
  });
  it("owner controls remain distinct from scoped moderation", () => {
    expect(canManage("MEMBER")).toBe(false);
    expect(canManage("MODERATOR")).toBe(false);
    expect(canManage("OWNER")).toBe(true);
    expect(canModerate("MODERATOR")).toBe(true);
    expect(canModerate("MEMBER")).toBe(false);
  });
  it("clears on protected 401 or unavailable but not capacity", () => {
    expect(
      isAccessLost(new ApiClientError("safe", 404, "GROUP_UNAVAILABLE")),
    ).toBe(true);
    expect(
      isAccessLost(new ApiClientError("safe", 401, "AUTH_SESSION_EXPIRED")),
    ).toBe(true);
    expect(
      isAccessLost(new ApiClientError("safe", 409, "GROUP_LIMIT_REACHED")),
    ).toBe(false);
  });
});
