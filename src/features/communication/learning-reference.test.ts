import { expect, it } from "vitest";
import { parseLearningReference } from "./learning-reference";
it.each([
  ["/community/posts/11111111-1111-4111-8111-111111111111", "COMMUNITY_POST"],
  [
    "https://community.test/library/22222222-2222-4222-8222-222222222222",
    "LIBRARY_RESOURCE",
  ],
])("parses an exact canonical first-party reference: %s", (url, type) => {
  expect(parseLearningReference(url, "https://community.test")).toEqual({
    type,
    id: url.split("/").at(-1),
  });
});
it.each([
  "https://foreign.test/library/22222222-2222-4222-8222-222222222222",
  "/community/posts/11111111-1111-4111-8111-111111111111?token=secret",
  "/library/22222222-2222-4222-8222-222222222222#snapshot",
  "/library/not-an-id",
  "//foreign.test/library/22222222-2222-4222-8222-222222222222",
])(
  "rejects unsupported, credential-bearing or noncanonical references: %s",
  (url) => {
    expect(parseLearningReference(url, "https://community.test")).toBeNull();
  },
);
