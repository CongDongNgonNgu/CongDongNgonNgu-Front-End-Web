import { expect, it, vi } from "vitest";
import { GroupSendAttempt } from "./group-send-attempt";
it("retains the client UUID for identical retries and rotates it only after payload changes or acknowledgement", () => {
  const ids = vi
    .fn()
    .mockReturnValueOnce("first")
    .mockReturnValueOnce("second")
    .mockReturnValueOnce("third");
  const attempt = new GroupSendAttempt(ids),
    draft = { body: "😀 draft" };
  expect(attempt.input(draft).clientMessageId).toBe("first");
  expect(attempt.input({ ...draft }).clientMessageId).toBe("first");
  expect(
    attempt.input({
      ...draft,
      contextType: "COMMUNITY_POST",
      contextId: "target",
    }).clientMessageId,
  ).toBe("second");
  attempt.clear();
  expect(attempt.input(draft).clientMessageId).toBe("third");
  expect(ids).toHaveBeenCalledTimes(3);
});
