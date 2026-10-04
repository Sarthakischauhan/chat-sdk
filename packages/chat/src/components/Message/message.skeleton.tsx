"use client";

import { Button } from "../../ui/button";

export const TextSkeleton = () => (
  <div className="chat-text-skeleton" role="status" aria-label="Assistant is writing">
    <span className="chat-skeleton-bar" />
    <span className="chat-skeleton-bar" />
    <span className="chat-skeleton-bar chat-skeleton-bar-short" />
  </div>
);

export const WidgetActionSkeleton = () => (
  <div className="chat-widget-action-skeleton" aria-label="Widget actions are loading">
    <Button skeleton size="sm" variant="secondary" type="button" tabIndex={-1} aria-hidden="true">
      Confirm
    </Button>
    <Button skeleton size="sm" variant="outline" type="button" tabIndex={-1} aria-hidden="true">
      Cancel
    </Button>
  </div>
);
