"use client";

import { memo, useEffect, useState } from "react";
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

  if (!selection || !text || selection.rangeCount === 0) {
    return null;
  }

  const anchorElement = selection.anchorNode?.parentElement;
  const focusElement = selection.focusNode?.parentElement;

  if (
    anchorElement?.closest("textarea,input,button,[data-reference-action]") ||
    focusElement?.closest("textarea,input,button,[data-reference-action]")
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
    top: Math.max(8, selectionRect.top - 44),
    left: Math.min(
      window.innerWidth - 96,
      Math.max(8, selectionRect.left + selectionRect.width / 2 - 36),
    ),
  };
};

const getReferenceShortcutLabel = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator?.platform) ? "Cmd + I" : "Ctrl + I";

type ChatTooltipProps = {
  onAddReference: (text: string) => void;
};

export const ChatTooltip = memo(function ChatTooltip({
  onAddReference,
}: ChatTooltipProps) {
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null);

  useEffect(() => {
    const updateSelectionAction = () => {
      window.setTimeout(() => {
        setSelectionAction(getSelectionAction());
      }, 0);
    };

    document.addEventListener("selectionchange", updateSelectionAction);

    return () => {
      document.removeEventListener("selectionchange", updateSelectionAction);
    };
  }, []);

  if (!selectionAction) {
    return null;
  }

  return createPortal(
    <Button
      type="button"
      size="sm"
      className="cursor-pointer fixed z-50 h-8 rounded-md px-2.5 font-mono text-xs shadow-lg"
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
