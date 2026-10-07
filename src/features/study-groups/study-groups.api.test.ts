import { describe, it, expect, vi } from "vitest";
import { StudyGroupsApi } from "./study-groups.api";
describe("protected group transport", () => {
  it("posts acceptance without a token URL and bounds pagination", async () => {
    const requestProtected = vi.fn().mockResolvedValue({});
    const api = new StudyGroupsApi({ requestProtected });
    await api.accept("group", "opaque");
    expect(requestProtected).toHaveBeenCalledWith(
      "/study-groups/invitations/accept",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ groupId: "group", token: "opaque" }),
      }),
    );
    await api.members("g/foreign", 1, 100);
    expect(requestProtected).toHaveBeenLastCalledWith(
      "/study-groups/g%2Fforeign/members?page=1&limit=20",
    );
  });
});

it("qualifies every nested mutation with its group and encodes foreign IDs", async () => {
  const requestProtected = vi.fn().mockResolvedValue({});
  const api = new StudyGroupsApi({ requestProtected });
  await api.revoke("g/x", "i/x");
  await api.remove("g/x", "u/x");
  await api.role("g/x", "u/x", "MODERATOR");
  await api.transfer("g/x", "u/x");
  await api.hide("g/x", "t/x");
  await api.report("g/x", "t/x", "reason");
  await api.resolve("g/x", "r/x");
  expect(requestProtected.mock.calls.map((c) => [c[0], c[1]?.method])).toEqual([
    ["/study-groups/g%2Fx/invitations/i%2Fx", "DELETE"],
    ["/study-groups/g%2Fx/members/u%2Fx", "DELETE"],
    ["/study-groups/g%2Fx/members/u%2Fx/role", "PATCH"],
    ["/study-groups/g%2Fx/ownership", "POST"],
    ["/study-groups/g%2Fx/texts/t%2Fx/hide", "POST"],
    ["/study-groups/g%2Fx/texts/t%2Fx/reports", "POST"],
    ["/study-groups/g%2Fx/reports/r%2Fx/resolve", "POST"],
  ]);
});
