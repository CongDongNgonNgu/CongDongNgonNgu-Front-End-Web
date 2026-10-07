import { useCallback } from "react";
import { StudyGroupsApi } from "../study-groups.api";
import { canManage, canModerate } from "../study-groups.policy";
import { useGroupResource } from "./useGroupResource";
export function useStudyGroup(
  api: StudyGroupsApi,
  groupId: string,
  userId: string,
  enabled: boolean,
  page: number,
) {
  const load = useCallback(async () => {
    const group = await api.get(groupId);
    const [members, texts, invitations, reports] = await Promise.all([
      api.members(groupId, page),
      api.texts(groupId, page),
      canManage(group.role) ? api.invitations(groupId, page) : null,
      canModerate(group.role) ? api.reports(groupId, page) : null,
    ]);
    return { group, members, texts, invitations, reports };
  }, [api, groupId, page]);
  return useGroupResource(userId + ":" + groupId + ":" + page, enabled, load);
}
