import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupMembers } from "./GroupMembers";
import { GroupTextPanel } from "./GroupTextPanel";
import type { GroupMember } from "../study-groups.types";
const members: GroupMember[] = [
  { userId: "o", displayName: "owner", role: "OWNER", joinedAt: "" },
  { userId: "m", displayName: "mod", role: "MODERATOR", joinedAt: "" },
  { userId: "u", displayName: "ordinary", role: "MEMBER", joinedAt: "" },
];
it("moderator can request removal only of another ordinary member", async () => {
  const action = vi.fn();
  render(
    <GroupMembers
      role="MODERATOR"
      userId="m"
      members={members}
      busy={false}
      onAction={action}
    />,
  );
  const buttons = screen.getAllByRole("button", { name: "Gỡ thành viên" });
  expect(buttons).toHaveLength(1);
  await userEvent.click(buttons[0]);
  expect(action).toHaveBeenCalledWith("remove", "u");
  expect(
    screen.queryByRole("button", { name: "Chỉ định điều phối viên" }),
  ).toBeNull();
});
it("ordinary member has reporting but no hide control and hidden body is not rendered", () => {
  render(
    <GroupTextPanel
      role="MEMBER"
      texts={[
        {
          id: "t",
          body: "HIDDEN SECRET",
          hidden: true,
          author: { userId: "u", displayName: "author" },
          createdAt: "",
        },
      ]}
      busy={false}
      onWrite={vi.fn()}
      onAction={vi.fn()}
    />,
  );
  expect(screen.queryByText("HIDDEN SECRET")).toBeNull();
  expect(screen.queryByRole("button", { name: "Ẩn nội dung" })).toBeNull();
});
