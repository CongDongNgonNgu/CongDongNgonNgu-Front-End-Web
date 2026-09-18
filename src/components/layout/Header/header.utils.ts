const FALLBACK_AVATAR_NAME = 'Thành viên';

export function resolveAvatarName(displayName?: string | null): string {
  return displayName?.trim() || FALLBACK_AVATAR_NAME;
}

export function runLogout(onLogout?: () => Promise<void> | void): void {
  try {
    const pending = onLogout?.();
    if (pending) void pending.catch(() => undefined);
  } catch {
    // The provider owns auth-state cleanup; the shell has no error surface.
  }
}
