import type { UIMessage } from "ai";

export type UserReferenceMessage = {
  references: string[];
  message: string;
};

export const REFERENCE_PREFIX = "Use the following selected references as context:\n\n";
export const USER_MESSAGE_MARKER = "\n\nUser message:\n";
const REFERENCE_PATTERN = /<reference \d+>\n([\s\S]*?)\n<\/reference \d+>/g;

export const getMessageTextContent = (message: UIMessage) =>
  message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");

export const parseUserReferenceMessage = (content: string): UserReferenceMessage | null => {
  if (!content.startsWith(REFERENCE_PREFIX)) {
    return null;
  }

  const markerIndex = content.indexOf(USER_MESSAGE_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  const references = [...content.slice(REFERENCE_PREFIX.length, markerIndex).matchAll(REFERENCE_PATTERN)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  return references.length
    ? { references, message: content.slice(markerIndex + USER_MESSAGE_MARKER.length) }
    : null;
};

export const getUserDisplayText = (message: UIMessage) => {
  const text = getMessageTextContent(message);
  return parseUserReferenceMessage(text)?.message ?? text;
};
