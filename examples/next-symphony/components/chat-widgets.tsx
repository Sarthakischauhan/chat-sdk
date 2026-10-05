"use client";

import {
  Bot,
  Brain,
  Check,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { defineWidget, type WidgetComponentProps } from "@sarchauhan/chat";

type QuestionWidgetProps = {
  prompt?: string;
  options?: Array<string | { label: string; value: string }>;
};

type MapWidgetProps = {
  lat?: number;
  lng?: number;
  label?: string;
  zoom?: number;
};

type SubagentWidgetEvent = {
  id?: string;
  kind?: "status" | "reasoning" | "tool" | "message";
  label?: string;
  detail?: unknown;
  status?: "running" | "completed" | "failed";
};

type SubagentWidgetProps = {
  childId?: string;
  label?: string;
  prompt?: string;
  modelId?: string;
  parentId?: string;
  depth?: number;
  maxTurns?: number;
  status?: "running" | "completed" | "failed" | "cancelled";
  phase?: string;
  response?: string;
  outputText?: string;
  error?: string;
  events?: SubagentWidgetEvent[];
};

const normalizeOptions = (options: QuestionWidgetProps["options"] = []) =>
  options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const formatEventDetail = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const SubagentEventIcon = ({ event }: { event: SubagentWidgetEvent }) => {
  if (event.status === "failed") return <CircleAlert />;
  if (event.status === "completed") return <CircleCheck />;
  if (event.kind === "reasoning") return <Brain />;
  if (event.kind === "tool") return <Wrench />;
  if (event.kind === "message") return <MessageSquareText />;
  return <LoaderCircle className="is-spinning" />;
};

function SubagentWidget({
  prompt,
  status = "running",
  phase,
  response,
  outputText,
  error,
  events = [],
}: WidgetComponentProps<SubagentWidgetProps>) {
  const result = outputText || (status !== "running" ? response : "");

  return (
    <div className="subagent-widget" data-status={status}>
      {prompt ? <p className="subagent-prompt">{prompt}</p> : null}

      {events.length > 0 ? (
        <ol className="subagent-timeline" aria-label="Subagent activity">
          {events.map((event, index) => {
            const detail = formatEventDetail(event.detail);
            return (
              <li
                key={event.id || `${event.label}-${index}`}
                className="subagent-timeline-item"
                data-kind={event.kind}
                data-status={event.status}
              >
                <span className="subagent-event-icon" aria-hidden="true">
                  <SubagentEventIcon event={event} />
                </span>
                <div className="subagent-event-copy">
                  <span>{event.label || "Activity"}</span>
                  {detail ? <pre>{detail}</pre> : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {status === "running" && response ? (
        <div className="subagent-live-response">
          <span>Live draft</span>
          <p>{response}</p>
        </div>
      ) : null}

      {result ? (
        <details className="subagent-result" open={status === "completed"}>
          <summary>Result</summary>
          <div>{result}</div>
        </details>
      ) : null}

      {error ? <div className="subagent-error">{error}</div> : null}
      {status === "running" && !response ? (
        <div className="subagent-working"><LoaderCircle /> {phase || "Working"}</div>
      ) : null}
    </div>
  );
}

function QuestionWidget({ options: rawOptions, widget }: WidgetComponentProps<QuestionWidgetProps>) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = normalizeOptions(rawOptions);
  const selectedLabel = options.find((option) => option.value === selected)?.label ?? selected;

  return (
    <>
      <div className="chat-widget-options">
        {options.map((option) => {
          const isActive = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className="chat-widget-option"
              data-selected={isActive ? "true" : undefined}
              disabled={!widget.interactive || widget.disabled}
              onClick={async () => {
                setSelected(option.value);
                await widget.respond(option.value, option.label, option.value);
              }}
            >
              <span className="chat-widget-option-text">{option.label}</span>
              <span className="chat-widget-option-check" aria-hidden="true">
                {isActive ? <Check /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {selectedLabel ? <div className="chat-widget-inline-meta">Selected: {selectedLabel}</div> : null}
    </>
  );
}

function MapWidget({
  lat: rawLat,
  lng: rawLng,
  label: rawLabel,
  zoom: rawZoom,
}: WidgetComponentProps<MapWidgetProps>) {
  const lat = asNumber(rawLat, 37.7749);
  const lng = asNumber(rawLng, -122.4194);
  const zoom = asNumber(rawZoom, 12);
  const label = typeof rawLabel === "string" ? rawLabel : "Map location";
  const delta = 0.04 / Math.max(zoom / 12, 0.5);
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${Math.round(zoom)}/${lat}/${lng}`;

  return (
    <>
      <div className="chat-widget-map-frame">
        <iframe
          title={label}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="chat-widget-map-pin" aria-hidden="true">
          <MapPin />
        </div>
      </div>
      <div className="chat-widget-inline-meta">
        <span>
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
        <a href={linkUrl} target="_blank" rel="noreferrer">
          Open map
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </>
  );
}

export const exampleWidgets = [
  defineWidget<QuestionWidgetProps>("question", QuestionWidget, {
    label: "",
    title: (props) => (typeof props.prompt === "string" ? props.prompt : "Choose an option"),
  }),
  defineWidget<MapWidgetProps>("map", MapWidget, {
    label: "Map",
    title: (props) => (typeof props.label === "string" ? props.label : "Map location"),
    status: (props) => {
      const zoom = typeof props.zoom === "number" && Number.isFinite(props.zoom) ? props.zoom : 12;
      return `Zoom ${Math.round(zoom)}`;
    },
    className: "chat-widget-map",
  }),
  defineWidget<SubagentWidgetProps>("subagent", SubagentWidget, {
    label: "Subagent",
    title: (props) => (
      <span className="subagent-title">
        <Bot aria-hidden="true" />
        {typeof props.label === "string" && props.label ? props.label : "Focused task"}
      </span>
    ),
    status: (props) => {
      if (props.status === "completed") return "Completed";
      if (props.status === "failed") return "Failed";
      if (props.status === "cancelled") return "Cancelled";
      return typeof props.phase === "string" && props.phase ? props.phase : "Running";
    },
    meta: (props) => {
      const parts = [
        typeof props.modelId === "string" ? props.modelId : "",
        typeof props.childId === "string" ? `child ${props.childId.slice(0, 8)}` : "",
        typeof props.parentId === "string" ? `delegated by ${props.parentId.slice(0, 8)}` : "",
        typeof props.maxTurns === "number" ? `${props.maxTurns} turn max` : "",
      ].filter(Boolean);
      return parts.join(" · ");
    },
    className: (props) => `chat-widget-subagent chat-widget-subagent-${props.status || "running"}`,
  }),
];
