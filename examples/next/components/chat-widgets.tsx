"use client";

import { Check, ExternalLink, MapPin } from "lucide-react";
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

const normalizeOptions = (options: QuestionWidgetProps["options"] = []) =>
  options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
                await widget.respond(option.value, option.label);
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
    label: "Question",
    title: (props) => (typeof props.prompt === "string" ? props.prompt : "Choose an option"),
    status: (_props, widget) =>
      widget.interactive && !widget.disabled ? "Awaiting input" : "Locked",
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
];
