"use client";

import type { ChatWidgetProps } from "./widget.context";

type MapProps = {
  lat?: number;
  lng?: number;
  label?: string;
  zoom?: number;
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function MapWidget({ props }: ChatWidgetProps<MapProps>) {
  const lat = asNumber(props.lat, 37.7749);
  const lng = asNumber(props.lng, -122.4194);
  const zoom = asNumber(props.zoom, 12);
  const label = typeof props.label === "string" ? props.label : "Map location";
  const delta = 0.04 / Math.max(zoom / 12, 0.5);
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${Math.round(zoom)}/${lat}/${lng}`;

  return (
    <div className="chat-widget-card chat-widget-map">
      <div className="chat-widget-label">Map</div>
      <div className="chat-widget-title">{label}</div>
      <div className="chat-widget-map-frame">
        <iframe title={label} src={embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="chat-widget-meta">
        {lat.toFixed(4)}, {lng.toFixed(4)} ·{" "}
        <a href={linkUrl} target="_blank" rel="noreferrer">
          Open map
        </a>
      </div>
    </div>
  );
}
