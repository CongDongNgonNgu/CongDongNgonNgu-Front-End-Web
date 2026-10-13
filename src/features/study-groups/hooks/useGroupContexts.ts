import { useLayoutEffect, useMemo, useState, useRef } from "react";
import { MessageContextRefresh } from "../../communication/message-context-refresh";
import type { StudyGroupsApi } from "../study-groups.api";
export function useGroupContexts(
  api: StudyGroupsApi,
  groupId: string,
  actor: string,
  enabled: boolean,
  onDenied: (error: unknown) => void,
) {
  const scope = useMemo(
    () => ({ api, groupId, actor, enabled }),
    [api, groupId, actor, enabled],
  );
  const current = useRef(scope);
  current.current = scope;
  const denied = useRef(onDenied);
  denied.current = onDenied;
  const [owned, setOwned] = useState<{
    scope: typeof scope;
    queue: MessageContextRefresh;
  } | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !actor) return;
    let alive = true;
    const queue = new MessageContextRefresh(
      {
        context: async (g, id, signal) => {
          try {
            const result = await api.context(g, id, signal);
            return { messageId: result.textId, context: result.context };
          } catch (error) {
            if (alive && current.current === scope) denied.current(error);
            throw error;
          }
        },
      },
      groupId,
    );
    setOwned({ scope, queue });
    const invalidate = () => queue.invalidate();
    window.addEventListener("focus", invalidate);
    document.addEventListener("visibilitychange", invalidate);
    const interval = window.setInterval(invalidate, 25000);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", invalidate);
      document.removeEventListener("visibilitychange", invalidate);
      queue.dispose();
    };
  }, [scope]);
  return owned?.scope === scope ? owned.queue : null;
}
