import type { LibraryResourceType } from "../library/library.types";
export type MessageContextType = "LIBRARY_RESOURCE" | "COMMUNITY_POST";
export type MessageContextCard =
  | { availability: "UNAVAILABLE" }
  | {
      availability: "AVAILABLE";
      type: MessageContextType;
      id: string;
      category: LibraryResourceType | "DISCUSSION" | "QUESTION";
      languageCode: string;
      previewText: string;
      canonicalPath: string;
    };
export interface MessageContextProjection {
  messageId: string;
  context: MessageContextCard | null;
}
export interface MessageContextApi {
  context(
    resourceId: string,
    itemId: string,
    signal?: AbortSignal,
  ): Promise<MessageContextProjection>;
}
