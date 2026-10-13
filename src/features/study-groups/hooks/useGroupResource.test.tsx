import { renderHook, act, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { useGroupResource } from "./useGroupResource";
import { ApiClientError } from "../../../services/api-client";
it("denial clears data and prevents a late protected response restoring it", async () => {
  let finish!: (v: string) => void;
  const load = vi
    .fn()
    .mockResolvedValueOnce("protected")
    .mockImplementationOnce(() => new Promise<string>((r) => (finish = r)));
  const { result } = renderHook(() => useGroupResource("g", true, load));
  await waitFor(() => expect(result.current.data).toBe("protected"));
  act(() => {
    void result.current.refresh();
  });
  await act(async () => {
    await result.current.perform(() =>
      Promise.reject(new ApiClientError("safe", 404, "GROUP_UNAVAILABLE")),
    );
  });
  expect(result.current.data).toBeNull();
  await act(async () => finish("stale secret"));
  expect(result.current.data).toBeNull();
});
it("scope change discards previous user data and late loads", async () => {
  let finish!: (v: string) => void;
  const load = vi
    .fn()
    .mockImplementationOnce(() => new Promise<string>((r) => (finish = r)))
    .mockResolvedValue("new user");
  const { result, rerender } = renderHook(
    ({ scope }) => useGroupResource(scope, true, load),
    { initialProps: { scope: "user1" } },
  );
  rerender({ scope: "user2" });
  await waitFor(() => expect(result.current.data).toBe("new user"));
  await act(async () => finish("old user secret"));
  expect(result.current.data).toBe("new user");
});

it('retains mounted data on a transient refresh failure when explicitly requested and still clears on access loss',async()=>{
 const load=vi.fn().mockResolvedValueOnce('protected').mockRejectedValueOnce(new Error('network'));
 const {result}=renderHook(()=>useGroupResource('A:g',true,load,true));
 await waitFor(()=>expect(result.current.data).toBe('protected'));
 await act(async()=>result.current.refresh());
 expect(result.current.data).toBe('protected');expect(result.current.error).toBeInstanceOf(Error);
 await act(async()=>result.current.perform(()=>Promise.reject(new ApiClientError('removed',404,'GROUP_UNAVAILABLE'))));
 expect(result.current.data).toBeNull();
});
