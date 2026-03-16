"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";

type PlatformReportEvent = {
  lat?: number | string | null;
  lng?: number | string | null;
};

function FitBounds({ events }: { events: Array<{ lat: number; lng: number }> }) {
  const map = useMap();

  useEffect(() => {
    if (!map || events.length === 0) return;

    const bounds = events.map((event) => [event.lat, event.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, events]);

  return null;
}

export default function AdminRecyclingHeatmap({
  events,
}: {
  events: PlatformReportEvent[];
}) {
  const center: [number, number] = [36.7213, -4.4214];
  const validEvents = events
    .map((e) => ({
      lat: Number(e.lat),
      lng: Number(e.lng),
    }))
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
  const dotMap = new Map<string, { lat: number; lng: number }>();

  validEvents.forEach((event) => {
    const key = `${event.lat.toFixed(4)}_${event.lng.toFixed(4)}`;

    if (!dotMap.has(key)) {
      dotMap.set(key, {
        lat: Number(event.lat.toFixed(4)),
        lng: Number(event.lng.toFixed(4)),
      });
    }
  });

  const dots = Array.from(dotMap.values());

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <MapContainer center={center} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="© OpenStreetMap contributors"
        />
        <FitBounds events={dots} />
        {dots.map((dot, index) => (
          <CircleMarker
            key={`loc-${index}`}
            center={[dot.lat, dot.lng]}
            radius={7}
            pathOptions={{
              color: "#2d6a4f",
              fillColor: "#2d6a4f",
              fillOpacity: 0.85,
              weight: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
