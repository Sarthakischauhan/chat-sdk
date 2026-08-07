import React from "react";
import { Text, useAnimation } from "ink";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function Spinner({ label }: { label?: string }) {
  const { frame } = useAnimation({ interval: 80 });
  const glyph = FRAMES[frame % FRAMES.length];

  return (
    <Text color="cyan">
      {glyph}
      {label ? ` ${label}` : ""}
    </Text>
  );
}
