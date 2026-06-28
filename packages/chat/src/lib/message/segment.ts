
export type ContentSegment = {
  type: "markdown" | "thinking";
  content: string;
  isComplete?: boolean;
};

/**
 * Split thinking segments of the AI message. 
 * @param content 
 * @returns 
 */
export const splitThinkingSegments = (content: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const openingIndex = content.indexOf("<thinking>", cursor);

    if (openingIndex === -1) {
      segments.push({
        type: "markdown",
        content: content.slice(cursor),
      });
      break;
    }

    if (openingIndex > cursor) {
      segments.push({
        type: "markdown",
        content: content.slice(cursor, openingIndex),
      });
    }

    const thinkingStart = openingIndex + "<thinking>".length;
    const closingIndex = content.indexOf("</thinking>", thinkingStart);

    if (closingIndex === -1) {
      segments.push({
        type: "thinking",
        content: content.slice(thinkingStart).trim(),
        isComplete: false,
      });
      break;
    }

    segments.push({
      type: "thinking",
      content: content.slice(thinkingStart, closingIndex).trim(),
      isComplete: true,
    });
    cursor = closingIndex + "</thinking>".length;
  }

  if (!segments.length) {
    return [{ type: "markdown", content }];
  }

  return segments;
};
