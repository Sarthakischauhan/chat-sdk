"use client";

import { useEffect, useRef, useState } from "react";
import { TextSwap } from "../../motion";

export const useElapsedTime = (active: boolean) => {
  const startedAtRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    startedAtRef.current = Date.now();
    setElapsed(0);

    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 100);

    return () => window.clearInterval(timer);
  }, [active]);

  return elapsed;
};

export const formatElapsed = (milliseconds: number, showTenths = false) => {
  const totalSeconds = Math.max(0, milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const formattedSeconds = showTenths ? seconds.toFixed(1) : String(Math.floor(seconds));

  return minutes > 0 ? `${minutes}m ${formattedSeconds}s` : `${formattedSeconds}s`;
};

export const formatElapsedWords = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));

  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const minuteLabel = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  return remainder > 0
    ? `${minuteLabel} ${remainder} ${remainder === 1 ? "second" : "seconds"}`
    : minuteLabel;
};

const PixelGrid = () => (
  <span className="chat-pixel-grid" aria-hidden="true">
    {Array.from({ length: 9 }, (_, index) => (
      <span key={index} />
    ))}
  </span>
);

type LoadingStateProps = {
  label?: string;
  compact?: boolean;
};

export const LoadingState = ({ label = "Churning", compact = false }: LoadingStateProps) => {
  const elapsed = useElapsedTime(true);

  return (
    <div className={`chat-loading${compact ? " chat-loading-inline" : ""}`} role="status" aria-live="polite">
      <PixelGrid />
      <TextSwap className="chat-loading-label" text={label} />
      <span className="chat-loading-timer" role="timer">
        {formatElapsed(elapsed, true)}
      </span>
      <span className="chat-visually-hidden">Loading conversation</span>
    </div>
  );
};
