import { useCallback, useEffect, useRef, useState } from "react";
import { isAccessLost } from "../study-groups.policy";
export function useGroupResource<T>(
  scope: string,
  enabled: boolean,
  load: () => Promise<T>,
) {
  const generation = useRef(0);
  const identity = useRef(scope);
  identity.current = scope;
  const [state, setState] = useState<{
    scope: string;
    data: T | null;
    loading: boolean;
    error: unknown;
  }>({ scope, data: null, loading: enabled, error: null });
  const clear = useCallback(
    (error: unknown = null) => {
      ++generation.current;
      setState({ scope, data: null, loading: false, error });
    },
    [scope],
  );
  const refresh = useCallback(async () => {
    const n = ++generation.current;
    const current = scope;
    setState({ scope, data: null, loading: enabled, error: null });
    if (!enabled) return;
    try {
      const data = await load();
      if (n === generation.current && identity.current === current)
        setState({ scope, data, loading: false, error: null });
    } catch (error) {
      if (n === generation.current && identity.current === current) {
        if (isAccessLost(error)) clear(error);
        else setState({ scope, data: null, loading: false, error });
      }
    }
  }, [scope, enabled, load, clear]);
  useEffect(() => {
    void refresh();
    return () => {
      ++generation.current;
    };
  }, [refresh]);
  const perform = useCallback(
    async <R>(operation: () => Promise<R>): Promise<R | undefined> => {
      const n = generation.current;
      const current = scope;
      try {
        const result = await operation();
        return n === generation.current && identity.current === current
          ? result
          : undefined;
      } catch (error) {
        if (identity.current === current) {
          if (isAccessLost(error)) clear(error);
          else if (n === generation.current) setState((s) => ({ ...s, error }));
        }
        return undefined;
      }
    },
    [scope, clear],
  );
  return {
    data: state.scope === scope && enabled ? state.data : null,
    loading: enabled && (state.scope !== scope || state.loading),
    error: state.scope === scope ? state.error : null,
    refresh,
    perform,
    clear,
  };
}
