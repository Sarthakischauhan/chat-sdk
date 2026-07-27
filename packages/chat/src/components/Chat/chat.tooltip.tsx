"use client";

import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SelectionAction = {
  text: string;
  top: number;
  left: number;
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

const positionFromRange = (range: Range): Pick<SelectionAction, "top" | "left"> | null => {
  const selectionRect = getSelectionRect(range);
  if (!selectionRect) {
    return null;
  }

  return {
    top: Math.max(8, selectionRect.top - 40),
    left: selectionRect.left + selectionRect.width / 2,
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

const getReferenceShortcutLabel = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator?.platform ?? "") ? "Cmd + I" : "Ctrl + I";

type ChatTooltipProps = {
  onAddReference: (text: string) => void;
};

export const ChatTooltip = memo(function ChatTooltip({
  onAddReference,
}: ChatTooltipProps) {
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const textRef = useRef("");
  const onAddReferenceRef = useRef(onAddReference);
  onAddReferenceRef.current = onAddReference;

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

      const position = positionFromRange(range);
      if (!position) {
        clearSelectionAction();
        return;
      }

      setSelectionAction({
        text: textRef.current,
        top: position.top,
        left: position.left,
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

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        clearSelectionAction();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "i") {
        return;
      }

      const text = textRef.current || readSelection()?.text;
      if (!text) {
        return;
      }

      event.preventDefault();
      onAddReferenceRef.current(text);
      window.getSelection()?.removeAllRanges();
      clearSelectionAction();
    };

    document.addEventListener("mouseup", captureSelection);
    document.addEventListener("keyup", captureSelection);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);

    return () => {
      document.removeEventListener("mouseup", captureSelection);
      document.removeEventListener("keyup", captureSelection);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, []);

  if (!selectionAction) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      className="chat-reference-action"
      style={{ top: selectionAction.top, left: selectionAction.left }}
      data-reference-action
      aria-label="Add selected text as reference"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onAddReference(selectionAction.text);
        window.getSelection()?.removeAllRanges();
        rangeRef.current = null;
        textRef.current = "";
        setSelectionAction(null);
      }}
    >
      {getReferenceShortcutLabel()}
    </button>,
    document.body,
  );
});
