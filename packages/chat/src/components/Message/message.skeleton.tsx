"use client";

export const TextSkeleton = () => (
  <div className="chat-text-skeleton" role="status" aria-label="Assistant is writing">
    <span className="chat-skeleton-bar" />
    <span className="chat-skeleton-bar" />
    <span className="chat-skeleton-bar chat-skeleton-bar-short" />
  </div>
);

export const WidgetActionSkeleton = () => (
  <div className="chat-widget-action-skeleton" aria-label="Widget actions are loading">
    <span className="chat-skeleton-bar chat-skeleton-control" />
    <span className="chat-skeleton-bar chat-skeleton-control chat-skeleton-control-short" />
  </div>
);
