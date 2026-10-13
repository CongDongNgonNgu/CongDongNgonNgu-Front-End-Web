import { describe, it, expect, vi } from "vitest";
import { StudyGroupsApi } from "./study-groups.api";
describe("protected group transport", () => {
  it("posts a connected partner only to the encoded owned group route", async () => {
    const requestProtected = vi.fn().mockResolvedValue({});
    await new StudyGroupsApi({ requestProtected }).issueConnectedPartner("g/owned", "partner");
    expect(requestProtected).toHaveBeenCalledWith("/study-groups/g%2Fowned/invitations/connected-partner", expect.objectContaining({ method: "POST", body: JSON.stringify({ partnerUserId: "partner" }) }));
  });
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

it('posts scoped bounded collaboration sync, idempotent send, observed read, and context lookup', async () => {
  const requestProtected=vi.fn().mockResolvedValue({});
  const api=new StudyGroupsApi({requestProtected});
  const input={body:'Note',clientMessageId:'11111111-1111-4111-8111-111111111111',contextType:'COMMUNITY_POST' as const,contextId:'22222222-2222-4222-8222-222222222222'};
  await api.write('g/x',input);
  expect(requestProtected).toHaveBeenLastCalledWith('/study-groups/g%2Fx/texts',expect.objectContaining({method:'POST',body:JSON.stringify(input)}));
  await api.sync('g/x',{cursor:'opaque-scope',renderedIds:['33333333-3333-4333-8333-333333333333'],limit:20});
  expect(requestProtected).toHaveBeenLastCalledWith('/study-groups/g%2Fx/texts/sync',expect.objectContaining({method:'POST',body:JSON.stringify({cursor:'opaque-scope',renderedIds:['33333333-3333-4333-8333-333333333333'],limit:20})}));
  await api.markRead('g/x','t/x');
  expect(requestProtected).toHaveBeenLastCalledWith('/study-groups/g%2Fx/read',expect.objectContaining({method:'POST',body:JSON.stringify({textId:'t/x'})}));
  await api.context('g/x','t/x');
  expect(requestProtected).toHaveBeenLastCalledWith('/study-groups/g%2Fx/texts/t%2Fx/context',expect.anything());
});
