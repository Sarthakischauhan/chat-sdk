"use client";

import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../ui/button";

type SelectionAction = {
  text: string;
  top: number;
  left: number;
};

const getSelectionAction = (): SelectionAction | null => {
  const selection = window.getSelection();
  const text = selection?.toString().replace(/\s+/g, " ").trim();

  if (!selection || !text || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const anchorElement = selection.anchorNode?.parentElement;
  const focusElement = selection.focusNode?.parentElement;

  if (
    anchorElement?.closest("textarea,input,[contenteditable='true']") ||
    focusElement?.closest("textarea,input,[contenteditable='true']")
  ) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const fallbackRect = range.getClientRects()[0];
  const selectionRect = rect.width || rect.height ? rect : fallbackRect;

  if (!selectionRect) {
    return null;
  }

  return {
    text,
    top: Math.max(8, selectionRect.top - 40),
    left: selectionRect.left + selectionRect.width / 2,
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
  const frameRef = useRef<number | null>(null);
  const onAddReferenceRef = useRef(onAddReference);
  onAddReferenceRef.current = onAddReference;

  useEffect(() => {
    const syncSelectionAction = () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setSelectionAction(getSelectionAction());
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "i") {
        return;
      }

      const next = getSelectionAction();
      if (!next) {
        return;
      }

      event.preventDefault();
      onAddReferenceRef.current(next.text);
      setSelectionAction(null);
      window.getSelection()?.removeAllRanges();
    };

    document.addEventListener("selectionchange", syncSelectionAction);
    document.addEventListener("mouseup", syncSelectionAction);
    document.addEventListener("keyup", syncSelectionAction);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", syncSelectionAction, true);
    window.addEventListener("resize", syncSelectionAction);

    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      document.removeEventListener("selectionchange", syncSelectionAction);
      document.removeEventListener("mouseup", syncSelectionAction);
      document.removeEventListener("keyup", syncSelectionAction);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", syncSelectionAction, true);
      window.removeEventListener("resize", syncSelectionAction);
    };
  }, []);

  if (!selectionAction) {
    return null;
  }

  return createPortal(
    <Button
      type="button"
      size="sm"
      className="chat-reference-action transition-none"
      style={{ top: selectionAction.top, left: selectionAction.left }}
      data-reference-action
      aria-label="Add selected text as reference"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onAddReference(selectionAction.text);
        setSelectionAction(null);
        window.getSelection()?.removeAllRanges();
      }}
    >
      {getReferenceShortcutLabel()}
    </Button>,
    document.body,
  );
});
