import type { MessageContextType } from "./context.types";
export interface LearningReference {
  type: MessageContextType;
  id: string;
}
export function parseLearningReference(
  input: string,
  origin = window.location.origin,
): LearningReference | null {
  try {
    const value = input.trim();
    if (!value || value.startsWith("//")) return null;
    const url = new URL(value, origin);
    if (
      url.origin !== new URL(origin).origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const match =
      /^\/(library|community\/posts)\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu.exec(
        url.pathname,
      );
    return match
      ? {
          type: match[1] === "library" ? "LIBRARY_RESOURCE" : "COMMUNITY_POST",
          id: match[2],
        }
      : null;
  } catch {
    return null;
  }
}
