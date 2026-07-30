"use client";

import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SelectionAction = {
  text: string;
  top: number;
  left: number;
  container: HTMLElement;
};

const isEditableSelection = (selection: Selection) => {
  const anchorElement = selection.anchorNode?.parentElement;
  const focusElement = selection.focusNode?.parentElement;

  return Boolean(
    anchorElement?.closest("textarea,input,[contenteditable='true']") ||
      focusElement?.closest("textarea,input,[contenteditable='true']"),
  );
};

const getSelectionRect = (range: Range) => {
  const rect = range.getBoundingClientRect();
  const fallbackRect = range.getClientRects()[0];
  return rect.width || rect.height ? rect : fallbackRect;
};

const positionFromRange = (
  range: Range,
  container: HTMLElement,
): Pick<SelectionAction, "top" | "left"> | null => {
  const selectionRect = getSelectionRect(range);
  if (!selectionRect) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();

  return {
    top: Math.max(8, selectionRect.top - containerRect.top + container.scrollTop),
    left: selectionRect.left - containerRect.left + container.scrollLeft + selectionRect.width / 2,
  };
};

const readSelection = (): { text: string; range: Range } | null => {
  const selection = window.getSelection();
  const text = selection?.toString().replace(/\s+/g, " ").trim();

  if (!selection || !text || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  if (isEditableSelection(selection)) {
    return null;
  }

  return {
    text,
    range: selection.getRangeAt(0).cloneRange(),
  };
};

const getPortalContainer = (range: Range) => {
  const node = range.commonAncestorContainer;
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(".chat-messages") as HTMLElement | null;
};

type ChatTooltipProps = {
  onAddReference: (text: string) => void;
};

export const ChatTooltip = memo(function ChatTooltip({
  onAddReference,
}: ChatTooltipProps) {
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const textRef = useRef("");

  useEffect(() => {
    const clearSelectionAction = () => {
      rangeRef.current = null;
      textRef.current = "";
      setSelectionAction(null);
    };

    const syncPosition = () => {
      const range = rangeRef.current;
      if (!range) {
        return;
      }

      const container = getPortalContainer(range);
      if (!container) {
        clearSelectionAction();
        return;
      }

      const position = positionFromRange(range, container);
      if (!position) {
        clearSelectionAction();
        return;
      }

      setSelectionAction({
        text: textRef.current,
        top: position.top,
        left: position.left,
        container,
      });
    };

    const captureSelection = () => {
      const next = readSelection();
      if (!next) {
        clearSelectionAction();
        return;
      }

      rangeRef.current = next.range;
      textRef.current = next.text;
      syncPosition();
    };

    document.addEventListener("mouseup", captureSelection);
    document.addEventListener("keyup", captureSelection);
    document.addEventListener("selectionchange", captureSelection);
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);

    return () => {
      document.removeEventListener("mouseup", captureSelection);
      document.removeEventListener("keyup", captureSelection);
      document.removeEventListener("selectionchange", captureSelection);
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [onAddReference]);

  if (!selectionAction) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      className="chat-reference-action"
      style={{ top: selectionAction.top, left: selectionAction.left }}
      aria-label="Add selected text as reference"
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => {
        onAddReference(selectionAction.text);
        window.getSelection()?.removeAllRanges();
        rangeRef.current = null;
        textRef.current = "";
        setSelectionAction(null);
      }}
    >
      Add reference
    </button>,
    selectionAction.container,
  );
});
