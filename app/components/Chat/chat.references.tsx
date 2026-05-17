"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "./chat.context";

export const ChatReferences = () => {
  const { state, dispatch } = useChat();

  if (state.references.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-1">
      {state.references.map((reference, index) => (
        <div
          key={reference.id}
          className="flex min-h-10 items-start gap-2 rounded-md border bg-muted/45 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-muted-foreground">
              Reference {index + 1}
            </div>
            <div className="line-clamp-2 break-words text-foreground/85">
              {reference.text}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="-mr-1 mt-0.5 shrink-0"
            aria-label={`Remove reference ${index + 1}`}
            onClick={() =>
              dispatch({
                type: "removeReference",
                data: { id: reference.id },
              })
            }
          >
            <X />
          </Button>
        </div>
      ))}
    </div>
  );
};
