"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { defineWidget, type WidgetComponentProps } from "@sarchauhan/chat";

type MapWidgetProps = {
  lat?: number;
  lng?: number;
  label?: string;
  zoom?: number;
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
