export function runLogout(onLogout?: () => Promise<void> | void): void {
  try {
    const pending = onLogout?.();
    if (pending) void pending.catch(() => undefined);
  } catch {
    // The provider owns auth-state cleanup; the shell has no error surface.
  }
}
