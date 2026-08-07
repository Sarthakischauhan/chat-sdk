import React, { useEffect, useState } from "react";
import { Box, Text, useInput, usePaste, useStdin } from "ink";
import { useChat } from "./chat.context";
import { useModelNavigation } from "./chat.model-picker";
import { useThreadNavigation } from "./chat.thread-list";

export function ChatComposer() {
  const {
    input,
    setInput,
    submitInput,
    stopResponse,
    isSending,
    status,
    focus,
    setFocus,
    showHelp,
    setShowHelp,
    createThread,
    deleteThread,
    threadId,
    scrollOffset,
    setScrollOffset,
    cycleModel,
    models,
    setModel,
  } = useChat();
  const { isRawModeSupported } = useStdin();
  const inputActive = Boolean(isRawModeSupported);

  const threadsNav = useThreadNavigation();
  const modelsNav = useModelNavigation();
  const [commandNotice, setCommandNotice] = useState<string | null>(null);

  const runCommand = async (value: string) => {
    const [name = "", ...args] = value.slice(1).trim().split(/\s+/);
    const command = name.toLowerCase();
    const argument = args.join(" ").trim();

    setInput("");
    setCommandNotice(null);

    switch (command) {
      case "new":
      case "clear":
        await createThread();
        setCommandNotice("Started a new conversation.");
        return;
      case "model": {
        if (!argument) {
          setFocus("models");
          setCommandNotice("Choose a model with ↑/↓, then press Enter.");
          return;
        }

        const selected = models.find(
          (entry) =>
            entry.id === argument ||
            entry.label.toLowerCase() === argument.toLowerCase() ||
            `${entry.provider}/${entry.id}` === argument,
        );
        if (!selected) {
          setCommandNotice(`Unknown model: ${argument}. Try /model.`);
          return;
        }

        setModel(selected.id);
        setCommandNotice(`Model set to ${selected.provider}/${selected.label}.`);
        return;
      }
      case "threads":
      case "thread":
        setFocus("threads");
        setCommandNotice("Choose a conversation with ↑/↓, then press Enter.");
        return;
      case "help":
      case "?":
        setShowHelp(true);
        setCommandNotice(null);
        return;
      case "stop":
        stopResponse();
        setCommandNotice("Stopped the response.");
        return;
      case "delete":
        if (threadId) {
          await deleteThread(threadId);
          setCommandNotice("Deleted the current conversation.");
        }
        return;
      default:
        setCommandNotice(`Unknown command: /${command}. Try /help.`);
    }
  };

  usePaste(
    (clipboard) => {
      if (focus !== "composer" || showHelp) {
        return;
      }
      setInput((current) => `${current}${clipboard}`);
    },
    { isActive: inputActive && focus === "composer" && !showHelp },
  );

  useInput(
    (char, key) => {
      if (key.ctrl && char === "c") {
        return;
      }

      if (showHelp && key.escape) {
        setShowHelp(false);
        setFocus("composer");
        return;
      }

      if (key.ctrl && char === "t") {
        setFocus("threads");
        setShowHelp(false);
        return;
      }

      if (key.ctrl && char === "l") {
        setFocus("messages");
        setShowHelp(false);
        return;
      }

      if (key.ctrl && char === "k") {
        setFocus("composer");
        setShowHelp(false);
        return;
      }

      if (key.ctrl && char === "m") {
        setFocus("models");
        setShowHelp(false);
        return;
      }

      if (key.ctrl && char === "n") {
        void createThread();
        return;
      }

      if (key.ctrl && char === "d" && threadId) {
        void deleteThread(threadId);
        return;
      }

      if (key.escape) {
        if (showHelp || focus === "models") {
          setShowHelp(false);
          setFocus("composer");
          return;
        }
        stopResponse();
        return;
      }

      if (focus === "threads" && threadsNav.enabled) {
        if (key.upArrow) {
          void threadsNav.move(-1);
          return;
        }
        if (key.downArrow) {
          void threadsNav.move(1);
          return;
        }
        if (key.return) {
          setFocus("composer");
          return;
        }
      }

      if (focus === "models" && modelsNav.enabled) {
        if (key.upArrow) {
          modelsNav.move(-1);
          return;
        }
        if (key.downArrow) {
          modelsNav.move(1);
          return;
        }
        if (key.return) {
          modelsNav.confirm();
          return;
        }
      }

      if (focus === "messages") {
        if (key.upArrow) {
          setScrollOffset((current) => current + 1);
          return;
        }
        if (key.downArrow) {
          setScrollOffset((current) => Math.max(0, current - 1));
          return;
        }
        if (key.return) {
          setFocus("composer");
          return;
        }
      }

      if (focus !== "composer" || showHelp) {
        return;
      }

      if (key.return) {
        if (!input.trim()) {
          return;
        }
        if (isSending && input.trim() !== "/stop") {
          return;
        }
        if (input.trimStart().startsWith("/")) {
          void runCommand(input.trim());
          return;
        }
        void submitInput();
        return;
      }

      if (key.backspace || key.delete) {
        setInput((current) => current.slice(0, -1));
        return;
      }

      if (key.tab) {
        cycleModel(key.shift ? -1 : 1);
        return;
      }

      if (key.ctrl || key.meta) {
        return;
      }

      if (char) {
        setInput((current) => `${current}${char}`);
        setCommandNotice(null);
      }
    },
    { isActive: inputActive },
  );

  useEffect(() => {
    if (scrollOffset < 0) {
      setScrollOffset(0);
    }
  }, [scrollOffset, setScrollOffset]);

  const statusLabel =
    status === "streaming"
      ? "streaming…"
      : status === "submitted"
        ? "sending…"
        : status === "error"
          ? "error"
          : "ready";

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box>
        <Text color="cyan">{"> "}</Text>
        <Text>{input}</Text>
        <Text color={focus === "composer" ? "white" : "gray"}>█</Text>
      </Box>
      {input.trimStart().startsWith("/") && !showHelp ? (
        <Text dimColor>
          commands: /new · /model · /threads · /help · /clear · /delete · /stop
        </Text>
      ) : null}
      {commandNotice ? <Text color="yellow">{commandNotice}</Text> : null}
      <Text dimColor>
        {statusLabel} · enter send · /help commands · esc stop
        {!inputActive ? " · (non-interactive stdin)" : ""}
      </Text>
    </Box>
  );
}
